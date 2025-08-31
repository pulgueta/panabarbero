import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { reviews } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
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
  const list = await db.query.reviews.findMany();

  if (!list || list.length === 0) {
    return c.json({ message: "Reviews not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getReview: ApiHandler<GetReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  const review = await db.query.reviews.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });

  if (!review) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(review, api.STATUS_CODES.OK);
};

export const updateReview: ApiHandler<UpdateReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.reviews.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(reviews)
    .set(json)
    .where(eq(reviews.uuid, uuid))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteReview: ApiHandler<DeleteReviewRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  const existing = await db.query.reviews.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json({ message: "Review not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await db.delete(reviews).where(eq(reviews.uuid, uuid)).returning();

  return c.json({ message: "Review deleted" }, api.STATUS_CODES.OK);
};
