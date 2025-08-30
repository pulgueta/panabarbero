import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  createdResourceSchema,
  createReviewSchema,
  reviewSchema,
  updateReviewSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { idParamsSchema, idQuerySchema } from "@/utils/schemas";

export const createReview = createRoute({
  method: "post",
  path: "/reviews",
  request: {
    body: requiredJsonContent(createReviewSchema, "The review to create"),
  },
  responses: {
    [api.STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Review created",
    ),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createReviewSchema,
      "The review is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createReviewSchema,
      "Validation error",
    ),
  },
});

export const getReviews = createRoute({
  method: "get",
  path: "/reviews",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      reviewSchema.array(),
      "The existing reviews",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Reviews not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateReview = createRoute({
  method: "put",
  path: "/reviews",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(updateReviewSchema, "The review to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(reviewSchema, "The updated review"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateReviewSchema,
      "The review is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateReviewSchema,
      "Validation error",
    ),
  },
});

export const deleteReview = createRoute({
  method: "delete",
  path: "/reviews",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(reviewSchema, "The review to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(reviewSchema, "The deleted review"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getReview = createRoute({
  method: "get",
  path: "/reviews/{id}",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(reviewSchema, "The review"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      idParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateReviewRoute = typeof createReview;
export type GetReviewsRoute = typeof getReviews;
export type UpdateReviewRoute = typeof updateReview;
export type DeleteReviewRoute = typeof deleteReview;
export type GetReviewRoute = typeof getReview;
