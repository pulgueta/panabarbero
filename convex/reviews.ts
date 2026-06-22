import { vOnCompleteArgs, Workpool } from "@convex-dev/workpool";
import { ConvexError, v } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import {
  zAuthMutation,
  zAuthQuery,
  zInternalMutation,
  zInternalQuery,
  zQuery,
} from ".";
import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { getBarbershopRatingValue, reviewRatingsAggregate } from "./aggregates";
import { track } from "./analytics";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { Review } from "./schema";
import { barbershops, reviews } from "./schema";
import { getProfileByUserId } from "./userProfileData";

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
 * Create a review. Gated entirely by a single-use review code minted on the
 * appointment when it was completed — there is no other entry point. A review
 * without a comment is published immediately; one with a comment is moderated
 * asynchronously and stays unpublished until cleared.
 */
export const create = zAuthMutation({
  args: z.object({
    code: z.uuidv4(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(500).optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "createReview", userId);

    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_reviewCode", (q) => q.eq("reviewCode", args.code))
      .unique();

    if (
      !appointment ||
      appointment.deletedAt ||
      appointment.reviewCode !== args.code
    ) {
      throw new ConvexError(errorMessages.reviewInvalidCode);
    }

    // Server-authoritative ownership: the code holder must be the customer.
    if (appointment.userId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (appointment.status !== "completed") {
      throw new ConvexError(errorMessages.reviewNotCompleted);
    }

    if (appointment.reviewCodeRedeemedAt) {
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

    // Consume the single-use code in the same transaction as the insert.
    await ctx.db.patch(appointment._id, { reviewCodeRedeemedAt: Date.now() });

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
      .withIndex("by_barbershopId_published", (q) =>
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

/** The authenticated user's own reviews (every state), newest first. */
export const getMine = zAuthQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

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

    const rows = await ctx.db
      .query("reviews")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    return rows.filter((review) => review.flaggedAt).length;
  },
});

/**
 * Validate a review code for the review page and return a summary of the visit.
 * Returns `null` for any invalid/used/foreign code so the route redirects to
 * the barbershop view without further fetches.
 */
export const getInvite = zAuthQuery({
  args: z.object({ code: z.string(), barbershopUuid: z.string() }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_reviewCode", (q) => q.eq("reviewCode", args.code))
      .unique();

    if (
      !appointment ||
      appointment.deletedAt ||
      appointment.reviewCode !== args.code ||
      appointment.userId !== userId ||
      appointment.status !== "completed" ||
      appointment.reviewCodeRedeemedAt
    ) {
      return null;
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop || barbershop.uuid !== args.barbershopUuid) {
      return null;
    }

    const service = await ctx.db.get(appointment.serviceId);

    return {
      barbershopId: barbershop._id,
      barbershopName: barbershop.name,
      barbershopUuid: barbershop.uuid,
      logoKey: barbershop.logoKey,
      serviceName: service?.name ?? "Servicio",
      date: appointment.date,
      customerName: appointment.customerName,
    };
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
