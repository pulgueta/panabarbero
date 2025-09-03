import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { reviews } from "@panabarbero/db/schema";
import type { Review } from "@panabarbero/db/schema/zod";
import { reviewSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
import type {
  CreateReviewRoute,
  DeleteReviewRoute,
  GetReviewRoute,
  GetReviewsRoute,
  UpdateReviewRoute,
} from "./routes";

export const createReview: ApiHandler<CreateReviewRoute> = async (c) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(reviews)
    .values(json)
    .returning({ id: reviews.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getReviews: ApiHandler<GetReviewsRoute> = async (c) => {
  let list: Review[] | undefined;

  const cachedReviews = await getCacheFromKey("reviews", reviewSchema.array());

  if (cachedReviews) {
    list = cachedReviews;
  } else {
    list = await db.query.reviews.findMany({
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!list || list.length === 0) {
    return c.json({ message: "Reviews not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey("reviews", list);

  return c.json(list, api.STATUS_CODES.OK);
};

export const getReview: ApiHandler<GetReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let review: Review | undefined;

  const cachedReview = await getCacheFromKey(`reviews:${uuid}`, reviewSchema);

  if (cachedReview) {
    review = cachedReview;
  } else {
    review = await db.query.reviews.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!review) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey(`reviews:${uuid}`, review);

  return c.json(review, api.STATUS_CODES.OK);
};

export const updateReview: ApiHandler<UpdateReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let review: Review | undefined;

  const cachedReview = await getCacheFromKey(`reviews:${uuid}`, reviewSchema);

  if (cachedReview) {
    review = cachedReview;
  } else {
    review = await db.query.reviews.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!review) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }
  const [updated] = await db
    .update(reviews)
    .set(json)
    .where(eq(reviews.uuid, uuid))
    .returning({
      uuid: reviews.uuid,
      rating: reviews.rating,
      comment: reviews.comment,
      userId: reviews.userId,
      barbershopId: reviews.barbershopId,
    });

  await setCacheFromKey(`reviews:${uuid}`, updated);

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteReview: ApiHandler<DeleteReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  let review: Review | undefined;

  const cachedReview = await getCacheFromKey(`reviews:${uuid}`, reviewSchema);

  if (cachedReview) {
    review = cachedReview;
  } else {
    review = await db.query.reviews.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!review) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await Promise.all([
    db.delete(reviews).where(eq(reviews.uuid, uuid)).returning(),
    deleteCacheFromKey(`reviews:${uuid}`),
  ]);

  return c.json({ message: "Review deleted" }, api.STATUS_CODES.OK);
};
