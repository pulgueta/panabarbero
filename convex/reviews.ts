import { vOnCompleteArgs, Workpool } from "@convex-dev/workpool";
import { convexToZod } from "convex-helpers/server/zod4";
import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { z } from "zod";

import {
  zAuthMutation,
  zAuthQuery,
  zInternalMutation,
  zInternalQuery,
  zQuery,
} from ".";
import { components, internal } from "./_generated/api";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getBarbershopRatingValue, reviewRatingsAggregate } from "./aggregates";
import { track } from "./analytics";
import { assertShopRole } from "./authz";
import { errorMessages } from "./errors";
import { getUserId } from "./identity";
import { rateLimitOrThrow } from "./ratelimit";
import type {
  Appointment,
  Barbershop,
  BarbershopMember,
  Review,
} from "./schema";
import { appointments, barbershops, reviews } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import { colombiaDateKeyToMs, toColombiaDateKey } from "./utils";

/**
 * Async review-comment moderation runs through a Workpool: bounded concurrency
 * plus exponential-backoff retries for the gateway LLM call. Fail-closed — a
 * review that carries a comment stays unpublished until the pool clears it.
 */
export const reviewModerationWorkpool = new Workpool(
  components.reviewModerationWorkpool,
  {
    maxParallelism: 5,
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: 4,
      initialBackoffMs: 1_000,
      base: 2,
    },
  },
);

/**
 * Mark a review as published and add it to the rating aggregate. Idempotent:
 * a review that is already published is left untouched. Visibility is keyed on
 * the `publishedAt` timestamp, never a boolean.
 */
async function publishReview(ctx: MutationCtx, reviewId: Review["_id"]) {
  const review = await ctx.db.get(reviewId);

  if (!review || review.publishedAt) {
    return;
  }

  await ctx.db.patch(reviewId, {
    publishedAt: Date.now(),
    flaggedAt: undefined,
    moderationReason: undefined,
  });

  await reviewRatingsAggregate.insert(ctx, {
    namespace: review.barbershopId,
    key: review._creationTime,
    id: review._id,
    sumValue: review.rating,
  });
}

/**
 * Settle a just-written review: with no comment to moderate it publishes
 * immediately; with a comment it stays unpublished and async moderation is
 * enqueued. Shared by `create` and `update`.
 */
async function settleReview(
  ctx: MutationCtx,
  reviewId: Review["_id"],
  comment: string | undefined,
) {
  if (!comment) {
    await publishReview(ctx, reviewId);

    return { status: "published" as const };
  }

  await reviewModerationWorkpool.enqueueAction(
    ctx,
    internal.reviewModeration.moderateReview,
    { reviewId },
    {
      onComplete: internal.reviews.onModerationComplete,
      context: { reviewId },
    },
  );

  return { status: "pending" as const };
}

/**
 * Create a review. Eligibility is derived server-side: the caller must own a
 * completed appointment that has no review yet — one review per completed
 * visit is the invariant, enforced through the `by_appointmentId` index. A
 * review without a comment is published immediately; one with a comment is
 * moderated asynchronously and stays unpublished until cleared.
 */
export const create = zAuthMutation({
  args: z.object({
    appointmentId: appointments.tools.id.shape.id,
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "createReview", userId);

    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment || appointment.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    // Server-authoritative ownership: only the customer may review their visit.
    if (appointment.userId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (appointment.status !== "completed") {
      throw new ConvexError(errorMessages.reviewNotCompleted);
    }

    // One review per completed appointment. The durable stamps (`reviewedAt`,
    // or the legacy review-code redemption) hold even after the review row is
    // deleted; the live-row check covers reviews that predate the stamp.
    if (appointment.reviewedAt || appointment.reviewCodeRedeemedAt) {
      throw new ConvexError(errorMessages.reviewAlreadyExists);
    }

    const existing = await ctx.db
      .query("reviews")
      .withIndex("by_appointmentId", (q) =>
        q.eq("appointmentId", appointment._id),
      )
      .unique();

    if (existing) {
      throw new ConvexError(errorMessages.reviewAlreadyExists);
    }

    const [service, profile] = await Promise.all([
      ctx.db.get(appointment.serviceId),
      getProfileByUserId(ctx, userId),
    ]);

    const comment = args.comment?.trim() || undefined;

    const reviewId = await ctx.db.insert("reviews", {
      rating: args.rating,
      comment,
      userId,
      barbershopId: appointment.barbershopId,
      appointmentId: appointment._id,
      serviceId: appointment.serviceId,
      serviceName: service?.name ?? "Servicio",
      authorName: profile?.name ?? appointment.customerName,
    });

    await ctx.db.patch(appointment._id, { reviewedAt: Date.now() });

    await track(ctx, {
      distinctId: userId,
      event: "review_created",
      properties: {
        reviewId,
        barbershopId: appointment.barbershopId,
        rating: args.rating,
        hasComment: !!comment,
      },
      groups: { barbershop: appointment.barbershopId },
    });

    return settleReview(ctx, reviewId, comment);
  },
});

/**
 * Edit a flagged review's comment. Published reviews are immutable; only a
 * flagged review can be corrected, which re-runs moderation. The star rating
 * is never editable.
 */
export const update = zAuthMutation({
  args: z.object({
    reviewId: reviews.tools.id.shape.id,
    comment: z.string().trim().max(500).optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateReview", userId);

    const review = await ctx.db.get(args.reviewId);

    if (!review) {
      throw new ConvexError(errorMessages.notFound("reseña"));
    }

    if (review.userId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Only a flagged review can be edited (to address the flag). A published
    // review is immutable.
    if (!review.flaggedAt) {
      throw new ConvexError(errorMessages.reviewImmutable);
    }

    const comment = args.comment?.trim() || undefined;

    await ctx.db.patch(args.reviewId, {
      comment,
      flaggedAt: undefined,
      moderationReason: undefined,
      publishedAt: undefined,
    });

    await track(ctx, {
      distinctId: userId,
      event: "review_updated",
      properties: {
        reviewId: args.reviewId,
        barbershopId: review.barbershopId,
      },
      groups: { barbershop: review.barbershopId },
    });

    return settleReview(ctx, args.reviewId, comment);
  },
});

/** Delete one's own review (flagged or published). Reviews cannot be modified. */
export const deleteReview = zAuthMutation({
  args: z.object({ reviewId: reviews.tools.id.shape.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "deleteReview", userId);

    const review = await ctx.db.get(args.reviewId);

    if (!review) {
      throw new ConvexError(errorMessages.notFound("reseña"));
    }

    if (review.userId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (review.publishedAt) {
      await reviewRatingsAggregate.deleteIfExists(ctx, {
        namespace: review.barbershopId,
        key: review._creationTime,
        id: review._id,
      });
    }

    // Reviews that predate the durable `reviewedAt` stamp never marked their
    // appointment — stamp it now so deleting doesn't reopen the visit.
    const appointment = await ctx.db.get(review.appointmentId);

    if (appointment && !appointment.reviewedAt) {
      await ctx.db.patch(appointment._id, {
        reviewedAt: review._creationTime,
      });
    }

    await ctx.db.delete(args.reviewId);

    await track(ctx, {
      distinctId: userId,
      event: "review_deleted",
      properties: {
        reviewId: args.reviewId,
        barbershopId: review.barbershopId,
      },
      groups: { barbershop: review.barbershopId },
    });
  },
});

/** Public: the most recent published reviews for a barbershop (default 6). */
export const getByBarbershop = zQuery({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    limit: z.number().int().min(1).max(20).optional(),
  }),
  handler: async (ctx, args) => {
    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_barbershopId_and_publishedAt", (q) =>
        q.eq("barbershopId", args.barbershopId).gt("publishedAt", 0),
      )
      .order("desc")
      .take(args.limit ?? 6);

    return rows.map((review) => ({
      _id: review._id,
      _creationTime: review._creationTime,
      rating: review.rating,
      comment: review.comment,
      authorName: review.authorName,
      serviceName: review.serviceName,
      publishedAt: review.publishedAt,
    }));
  },
});

/** Public: O(log n) average rating + published-review count for a barbershop. */
export const getBarbershopRating = zQuery({
  args: z.object({ barbershopId: barbershops.tools.id.shape.id }),
  handler: (ctx, args) => getBarbershopRatingValue(ctx, args.barbershopId),
});

/**
 * Public: per-star published-review histogram for the detail page's reviews
 * card. Same bounded index scan the dashboard stats use.
 */
export const getBarbershopRatingDistribution = zQuery({
  args: z.object({ barbershopId: barbershops.tools.id.shape.id }),
  handler: (ctx, args) =>
    getPublishedRatingDistribution(ctx, args.barbershopId),
});

/**
 * Cap on the profile "Reseñas" tab. A customer's own reviews are naturally
 * bounded by their completed-appointment history, so this ceiling is invisible
 * in practice; it only guards the pathological case. Plain `.take()` (not
 * pagination) because the tab groups the *whole* set by moderation status
 * (`flagged`/`pending`/`published`) — status is timestamp-derived, not
 * page-ordered, so a cursor would scatter flagged reviews across pages and bury
 * the "Necesitan tu atención" surface.
 */
const MY_REVIEWS_LIMIT = 100;

/**
 * Caps on the reviewable-appointment lookups. `REVIEWABLE_LIMIT` bounds how
 * many eligible rows we surface; `REVIEWABLE_SCAN_CAP` bounds how far we scan
 * looking for them, so a customer whose newest visits are all already reviewed
 * still surfaces older eligible ones without an unbounded scan. A completed
 * history is naturally small, so both ceilings are invisible in practice.
 */
const REVIEWABLE_LIMIT = 50;
const REVIEWABLE_SCAN_CAP = 500;

/** The authenticated user's own reviews (every state), newest first. */
export const getMine = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(MY_REVIEWS_LIMIT);

    return await Promise.all(
      rows.map(async (review) => {
        const barbershop = await ctx.db.get(review.barbershopId);

        return {
          _id: review._id,
          _creationTime: review._creationTime,
          rating: review.rating,
          comment: review.comment,
          serviceName: review.serviceName,
          barbershopName: barbershop?.name ?? "Barbería",
          barbershopUuid: barbershop?.uuid,
          moderationReason: review.moderationReason,
          status: review.flaggedAt
            ? ("flagged" as const)
            : review.publishedAt
              ? ("published" as const)
              : ("pending" as const),
        };
      }),
    );
  },
});

/** Count of the user's reviews that need attention (flagged) — drives the tab badge. */
export const countMineNeedingAttention = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    // Read only the flagged rows via the composite index — `flaggedAt` is sparse,
    // so `gt(..., 0)` returns just the (naturally tiny, self-clearing) set that
    // needs attention instead of scanning every review the user has ever left.
    const flagged = await ctx.db
      .query("reviews")
      .withIndex("by_userId_and_flaggedAt", (q) =>
        q.eq("userId", userId).gt("flaggedAt", 0),
      )
      .collect();

    return flagged.length;
  },
});

/**
 * The authenticated user's completed appointments that have no review yet,
 * newest first. Eligibility is derived server-side; each survivor is resolved
 * to its barbershop + service for the "deja tu reseña" surface. Appointments
 * whose barbershop no longer exists are skipped.
 */
export const getReviewableAppointments = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const resolved: {
      appointmentId: Appointment["_id"];
      barbershopId: Appointment["barbershopId"];
      barbershopUuid: string;
      barbershopName: string;
      logoKey: string | undefined;
      serviceName: string;
      date: number;
    }[] = [];
    let scanned = 0;

    // Stream newest-first and keep the eligible survivors. Reviewed/redeemed
    // rows are skipped without counting against the result cap, so a customer
    // whose latest visits are all reviewed still surfaces older eligible ones —
    // bounded by REVIEWABLE_SCAN_CAP so the scan can never run away.
    for await (const appointment of ctx.db
      .query("appointments")
      .withIndex("by_userId_and_status", (q) =>
        q.eq("userId", userId).eq("status", "completed"),
      )
      .order("desc")) {
      if (
        resolved.length >= REVIEWABLE_LIMIT ||
        scanned >= REVIEWABLE_SCAN_CAP
      ) {
        break;
      }
      scanned += 1;

      if (
        appointment.deletedAt ||
        appointment.reviewedAt ||
        appointment.reviewCodeRedeemedAt
      ) {
        continue;
      }

      const existing = await ctx.db
        .query("reviews")
        .withIndex("by_appointmentId", (q) =>
          q.eq("appointmentId", appointment._id),
        )
        .unique();

      if (existing) {
        continue;
      }

      const [barbershop, service] = await Promise.all([
        ctx.db.get(appointment.barbershopId),
        ctx.db.get(appointment.serviceId),
      ]);

      if (!barbershop) {
        continue;
      }

      resolved.push({
        appointmentId: appointment._id,
        barbershopId: appointment.barbershopId,
        barbershopUuid: barbershop.uuid,
        barbershopName: barbershop.name ?? "Barbería",
        logoKey: barbershop.logoKey,
        serviceName: service?.name ?? "Servicio",
        date: appointment.date,
      });
    }

    return resolved;
  },
});

/**
 * Public (single-barbershop page): the caller's newest completed, not-yet-
 * reviewed appointment at this barbershop, or `null`. Tolerates an
 * unauthenticated caller by returning `null` — never throws — so the public
 * route can render without an auth gate.
 */
export const getReviewableForBarbershop = zQuery({
  args: z.object({ barbershopId: barbershops.tools.id.shape.id }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return null;
    }

    // Stream newest-first until the first eligible visit turns up. The scan cap
    // bounds work when this shop's recent visits are all reviewed/redeemed.
    let scanned = 0;

    for await (const appointment of ctx.db
      .query("appointments")
      .withIndex("by_userIdAndBarbershopId", (q) =>
        q.eq("userId", userId).eq("barbershopId", args.barbershopId),
      )
      .order("desc")) {
      if (scanned >= REVIEWABLE_SCAN_CAP) {
        break;
      }
      scanned += 1;

      if (
        appointment.status !== "completed" ||
        appointment.deletedAt ||
        appointment.reviewedAt ||
        appointment.reviewCodeRedeemedAt
      ) {
        continue;
      }

      const existing = await ctx.db
        .query("reviews")
        .withIndex("by_appointmentId", (q) =>
          q.eq("appointmentId", appointment._id),
        )
        .unique();

      if (existing) {
        continue;
      }

      const service = await ctx.db.get(appointment.serviceId);

      return {
        appointmentId: appointment._id,
        serviceName: service?.name ?? "Servicio",
        date: appointment.date,
      };
    }

    return null;
  },
});

/** Internal: read the current moderation-relevant state of a review. */
export const getForModeration = zInternalQuery({
  args: z.object({ reviewId: reviews.tools.id.shape.id }),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);

    if (!review) {
      return null;
    }

    return {
      _id: review._id,
      comment: review.comment,
      publishedAt: review.publishedAt,
      flaggedAt: review.flaggedAt,
    };
  },
});

/**
 * Internal: apply a moderation verdict. Called by the Workpool action. Clean →
 * publish; flagged → keep unpublished, record the reason, and notify the author
 * in-app so the tab badge lights up.
 */
export const applyModeration = zInternalMutation({
  args: z.object({
    reviewId: reviews.tools.id.shape.id,
    verdict: z.enum(["clean", "flagged"]),
    reason: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);

    // The author may have deleted the review between enqueue and run.
    if (!review) {
      return;
    }

    if (args.verdict === "clean") {
      await publishReview(ctx, args.reviewId);

      await track(ctx, {
        distinctId: review.userId,
        event: "review_published",
        properties: {
          reviewId: args.reviewId,
          barbershopId: review.barbershopId,
        },
        groups: { barbershop: review.barbershopId },
      });

      return;
    }

    // Keep the rating aggregate self-consistent: any path that un-publishes a
    // review must drop its aggregate entry, so a flagged review can never keep
    // contributing to the public average. Mirrors publishReview/deleteReview.
    if (review.publishedAt) {
      await reviewRatingsAggregate.deleteIfExists(ctx, {
        namespace: review.barbershopId,
        key: review._creationTime,
        id: review._id,
      });
    }

    await ctx.db.patch(args.reviewId, {
      flaggedAt: Date.now(),
      moderationReason:
        args.reason ??
        "Tu reseña contiene lenguaje que no cumple nuestras normas de comunidad.",
      publishedAt: undefined,
    });

    await track(ctx, {
      distinctId: review.userId,
      event: "review_flagged",
      properties: {
        reviewId: args.reviewId,
        barbershopId: review.barbershopId,
      },
      groups: { barbershop: review.barbershopId },
    });

    await ctx.runMutation(internal.notifications.createReviewNeedsAttention, {
      reviewId: args.reviewId,
    });
  },
});

/**
 * Workpool onComplete callback. Only the terminal-failure case matters: the
 * moderation action exhausted its retries (e.g. a sustained gateway outage)
 * without ever publishing or flagging, which would otherwise strand the review
 * in "pending" forever — uneditable (`update` is flagged-only) and with the
 * single-use code already consumed, so the author has no recovery. We flag it
 * (fail-closed: it stays unpublished) so the author is notified via the tab
 * badge and can edit + resubmit to re-moderate. `success`/`canceled` are no-ops
 * (the action already resolved the review on success).
 *
 * The Workpool dictates the argument validator through `vOnCompleteArgs` (a
 * Convex validator); `convexToZod` bridges it into the zod wrapper so this stays
 * consistent with every other function in the file.
 */
export const onModerationComplete = zInternalMutation({
  args: convexToZod(vOnCompleteArgs(v.object({ reviewId: v.id("reviews") }))),
  handler: async (ctx, { context, result }) => {
    if (result.kind !== "failed") {
      return;
    }

    const review = await ctx.db.get(context.reviewId);

    // Deleted by the author, or already resolved before the action failed.
    if (!review || review.publishedAt || review.flaggedAt) {
      return;
    }

    await ctx.runMutation(internal.reviews.applyModeration, {
      reviewId: context.reviewId,
      verdict: "flagged",
      reason:
        "No pudimos revisar tu reseña automáticamente. Edítala y vuelve a enviarla para publicarla.",
    });
  },
});

// ---------------------------------------------------------------------------
// Owner-facing review analytics ("Reseñas" dashboard)
// ---------------------------------------------------------------------------

/** Star ratings, ascending — the fixed histogram buckets. */
const STAR_RATINGS = [1, 2, 3, 4, 5] as const;

/** Months of history returned by the rating trend. */
const TREND_MONTHS = 6;

/** Newest-first cap on the flagged moderation-monitoring panel. */
const MODERATION_QUEUE_LIMIT = 50;

/**
 * The review analytics section is management-only (owner + staff) — barbers do
 * not see the shop-wide moderation surface. Every analytics query below funnels
 * through this single gate.
 */
async function assertCanViewReviewAnalytics(
  ctx: QueryCtx,
  barbershopId: Barbershop["_id"],
  userId: string,
) {
  await assertShopRole(ctx, barbershopId, userId, ["owner", "staff"]);
}

/** Derive the display status from the timestamp pair (single source of truth). */
function reviewStatus(review: {
  publishedAt?: number;
  flaggedAt?: number;
}): "published" | "flagged" | "pending" {
  if (review.flaggedAt) {
    return "flagged";
  }

  if (review.publishedAt) {
    return "published";
  }

  return "pending";
}

/**
 * Paginated review feed for the owner dashboard.
 *
 * `rating` and `status` are mutually-exclusive single filters (the dashboard
 * presents one unified filter control); if both are sent, `status` wins. Every
 * branch resolves to a pure `.withIndex` range — never `.filter` — per the
 * repo's index-only convention:
 *   - unfiltered / `rating` / `pending`  → ordered by creation (desc)
 *   - `published`                        → ordered by publishedAt (desc)
 *   - `flagged`                          → ordered by flaggedAt (desc)
 * "pending" (neither published nor flagged) rides the composite
 * `by_barbershopId_and_publishedAt_and_flaggedAt` with both timestamps unset,
 * which leaves `_creationTime` as the trailing sort column.
 */
export const listForShop = zAuthQuery({
  args: z.object({
    barbershop: barbershops.tools.id,
    rating: z.number().int().min(1).max(5).optional(),
    status: z.enum(["published", "flagged", "pending"]).optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertCanViewReviewAnalytics(ctx, barbershopId, userId);

    const { rating, status } = args;

    const ordered = (() => {
      if (status === "published") {
        return ctx.db
          .query("reviews")
          .withIndex("by_barbershopId_and_publishedAt", (q) =>
            q.eq("barbershopId", barbershopId).gt("publishedAt", 0),
          )
          .order("desc");
      }

      if (status === "flagged") {
        return ctx.db
          .query("reviews")
          .withIndex("by_barbershopId_and_flaggedAt", (q) =>
            q.eq("barbershopId", barbershopId).gt("flaggedAt", 0),
          )
          .order("desc");
      }

      if (status === "pending") {
        return ctx.db
          .query("reviews")
          .withIndex("by_barbershopId_and_publishedAt_and_flaggedAt", (q) =>
            q
              .eq("barbershopId", barbershopId)
              .eq("publishedAt", undefined)
              .eq("flaggedAt", undefined),
          )
          .order("desc");
      }

      if (rating !== undefined) {
        return ctx.db
          .query("reviews")
          .withIndex("by_barbershopId_and_rating", (q) =>
            q.eq("barbershopId", barbershopId).eq("rating", rating),
          )
          .order("desc");
      }

      return ctx.db
        .query("reviews")
        .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
        .order("desc");
    })();

    const result = await ordered.paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.map((review) => ({
        _id: review._id,
        _creationTime: review._creationTime,
        rating: review.rating,
        comment: review.comment,
        authorName: review.authorName,
        serviceName: review.serviceName,
        publishedAt: review.publishedAt,
        flaggedAt: review.flaggedAt,
        moderationReason: review.moderationReason,
        status: reviewStatus(review),
      })),
    };
  },
});

/**
 * Per-star histogram of published, unflagged reviews — a bounded scan of the
 * rating index, counting in JS. Shared by the public detail page and the
 * dashboard stats.
 */
async function getPublishedRatingDistribution(
  ctx: QueryCtx,
  barbershopId: Barbershop["_id"],
) {
  const perStar = await Promise.all(
    STAR_RATINGS.map((star) =>
      ctx.db
        .query("reviews")
        .withIndex("by_barbershopId_and_rating", (q) =>
          q.eq("barbershopId", barbershopId).eq("rating", star),
        )
        .collect(),
    ),
  );

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as Record<
    1 | 2 | 3 | 4 | 5,
    number
  >;

  STAR_RATINGS.forEach((star, index) => {
    distribution[star] = perStar[index].filter(
      (review) =>
        review.publishedAt !== undefined && review.flaggedAt === undefined,
    ).length;
  });

  return distribution;
}

/**
 * Headline review stats for the dashboard. Average + published total come from
 * the O(log n) rating aggregate (which only ever holds published, unflagged
 * reviews). The per-star histogram is a bounded scan of the rating index,
 * counting published+unflagged rows in JS; `flaggedCount` reads the sparse
 * flagged index only.
 */
export const getShopReviewStats = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertCanViewReviewAnalytics(ctx, barbershopId, userId);

    const [{ average, count }, flagged, distribution] = await Promise.all([
      getBarbershopRatingValue(ctx, barbershopId),
      ctx.db
        .query("reviews")
        .withIndex("by_barbershopId_and_flaggedAt", (q) =>
          q.eq("barbershopId", barbershopId).gt("flaggedAt", 0),
        )
        .collect(),
      getPublishedRatingDistribution(ctx, barbershopId),
    ]);

    return {
      average,
      total: count,
      publishedCount: count,
      flaggedCount: flagged.length,
      distribution,
    };
  },
});

/**
 * Average rating + published-review count per month for the last 6 Bogotá-local
 * months. Reads the rating aggregate with `_creationTime` bounds per month — no
 * ledger scan — mirroring `inventory.getMonthlyConsumption`.
 */
export const getShopRatingTrend = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertCanViewReviewAnalytics(ctx, barbershopId, userId);

    // Current Bogotá month, then walk back to build the last 6 month keys.
    const currentMonth = toColombiaDateKey(Date.now()).slice(0, 7);
    const [currentYear, currentMonthNumber] = currentMonth
      .split("-")
      .map(Number);
    const baseMonthIndex = currentYear * 12 + (currentMonthNumber - 1);

    const monthKeys: string[] = [];

    for (let offset = TREND_MONTHS - 1; offset >= 0; offset--) {
      const monthIndex = baseMonthIndex - offset;
      const year = Math.floor(monthIndex / 12);
      const monthNumber = (monthIndex % 12) + 1;

      monthKeys.push(`${year}-${String(monthNumber).padStart(2, "0")}`);
    }

    return await Promise.all(
      monthKeys.map(async (month) => {
        const [year, monthNumber] = month.split("-").map(Number);
        const nextMonth =
          monthNumber === 12
            ? `${year + 1}-01`
            : `${year}-${String(monthNumber + 1).padStart(2, "0")}`;

        const bounds = {
          lower: {
            key: colombiaDateKeyToMs(`${month}-01`),
            inclusive: true as const,
          },
          upper: {
            key: colombiaDateKeyToMs(`${nextMonth}-01`),
            inclusive: false as const,
          },
        };

        const [sum, count] = await Promise.all([
          reviewRatingsAggregate.sum(ctx, { namespace: barbershopId, bounds }),
          reviewRatingsAggregate.count(ctx, {
            namespace: barbershopId,
            bounds,
          }),
        ]);

        return { month, average: count > 0 ? sum / count : 0, count };
      }),
    );
  },
});

/**
 * Average rating + count grouped by service (snapshot name) and by barber
 * (review → appointment → `barbershopMemberId` → member name). Scans published,
 * unflagged reviews; member names are resolved once and cached per member.
 */
export const getShopReviewBreakdown = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertCanViewReviewAnalytics(ctx, barbershopId, userId);

    const published = (
      await ctx.db
        .query("reviews")
        .withIndex("by_barbershopId_and_publishedAt", (q) =>
          q.eq("barbershopId", barbershopId).gt("publishedAt", 0),
        )
        .collect()
    ).filter((review) => review.flaggedAt === undefined);

    // Resolve every appointment up front instead of one round trip per review.
    const appointments = await Promise.all(
      published.map((review) => ctx.db.get(review.appointmentId)),
    );

    const serviceStats = new Map<string, { sum: number; count: number }>();
    const barberStats = new Map<
      BarbershopMember["_id"],
      { sum: number; count: number; name: string }
    >();
    const memberNameCache = new Map<BarbershopMember["_id"], string>();

    for (const [index, review] of published.entries()) {
      const service = serviceStats.get(review.serviceName) ?? {
        sum: 0,
        count: 0,
      };
      service.sum += review.rating;
      service.count += 1;
      serviceStats.set(review.serviceName, service);

      const appointment = appointments[index];

      if (!appointment) {
        continue;
      }

      const memberId = appointment.barbershopMemberId;
      let name = memberNameCache.get(memberId);

      if (name === undefined) {
        const member = await ctx.db.get(memberId);
        const profile = member
          ? await ctx.db.get(member.userProfileDataId)
          : null;
        name = profile?.name ?? "Barbero";
        memberNameCache.set(memberId, name);
      }

      const barber = barberStats.get(memberId) ?? { sum: 0, count: 0, name };
      barber.sum += review.rating;
      barber.count += 1;
      barberStats.set(memberId, barber);
    }

    const byService = Array.from(serviceStats.entries())
      .map(([serviceName, stats]) => ({
        serviceName,
        average: stats.count > 0 ? stats.sum / stats.count : 0,
        count: stats.count,
      }))
      .sort((a, b) => b.count - a.count);

    const byBarber = Array.from(barberStats.entries())
      .map(([barbershopMemberId, stats]) => ({
        barbershopMemberId,
        name: stats.name,
        average: stats.count > 0 ? stats.sum / stats.count : 0,
        count: stats.count,
      }))
      .sort((a, b) => b.count - a.count);

    return { byService, byBarber };
  },
});

/**
 * Flagged reviews for the shop (newest-flagged first, capped at 50) — feeds the
 * moderation-monitoring panel. Reads the sparse flagged index only.
 */
export const getModerationQueue = zAuthQuery({
  args: z.object({ barbershop: barbershops.tools.id }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const barbershopId = args.barbershop.id;

    await assertCanViewReviewAnalytics(ctx, barbershopId, userId);

    const flagged = await ctx.db
      .query("reviews")
      .withIndex("by_barbershopId_and_flaggedAt", (q) =>
        q.eq("barbershopId", barbershopId).gt("flaggedAt", 0),
      )
      .order("desc")
      .take(MODERATION_QUEUE_LIMIT);

    return flagged.map((review) => ({
      _id: review._id,
      _creationTime: review._creationTime,
      rating: review.rating,
      comment: review.comment,
      authorName: review.authorName,
      serviceName: review.serviceName,
      flaggedAt: review.flaggedAt,
      moderationReason: review.moderationReason,
    }));
  },
});
