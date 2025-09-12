import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  createdResourceSchema,
  createReviewSchema,
  reviewSchema,
  updateReviewSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createReview = createRoute({
  method: "post",
  path: "/reviews",
  request: {
    body: requiredJsonContent(createReviewSchema, "The review to create"),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Review created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createReviewSchema,
      "The review is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createReviewSchema,
      "Validation error",
    ),
  },
});

export const getReviews = createRoute({
  method: "get",
  path: "/reviews",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      reviewSchema.array(),
      "The existing reviews",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Reviews not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateReview = createRoute({
  method: "put",
  path: "/reviews",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(updateReviewSchema, "The review to update"),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(reviewSchema, "The updated review"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateReviewSchema,
      "The review is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateReviewSchema,
      "Validation error",
    ),
  },
});

export const deleteReview = createRoute({
  method: "delete",
  path: "/reviews",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Review deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getReview = createRoute({
  method: "get",
  path: "/reviews",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(reviewSchema, "The review"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Review not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateReviewRoute = typeof createReview;
export type GetReviewsRoute = typeof getReviews;
export type UpdateReviewRoute = typeof updateReview;
export type DeleteReviewRoute = typeof deleteReview;
export type GetReviewRoute = typeof getReview;
