import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  createdResourceSchema,
  createMobilePushTokenSchema,
  mobilePushTokenSchema,
  updateMobilePushTokenSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createMobilePushToken = createRoute({
  method: "post",
  path: "/push-tokens",
  request: {
    body: requiredJsonContent(
      createMobilePushTokenSchema,
      "The mobile push token to create",
    ),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Mobile push token created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createMobilePushTokenSchema,
      "The mobile push token is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createMobilePushTokenSchema,
      "Validation error",
    ),
  },
});

export const getMobilePushTokens = createRoute({
  method: "get",
  path: "/push-tokens",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      mobilePushTokenSchema.array(),
      "The existing mobile push tokens",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Mobile push tokens not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateMobilePushToken = createRoute({
  method: "put",
  path: "/push-tokens",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(
      updateMobilePushTokenSchema,
      "The mobile push token to update",
    ),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      mobilePushTokenSchema,
      "The updated mobile push token",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Mobile push token not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateMobilePushTokenSchema,
      "The mobile push token is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateMobilePushTokenSchema,
      "Validation error",
    ),
  },
});

export const deleteMobilePushToken = createRoute({
  method: "delete",
  path: "/push-tokens",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Mobile push token deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Mobile push token not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getMobilePushToken = createRoute({
  method: "get",
  path: "/push-tokens",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      mobilePushTokenSchema,
      "The mobile push token",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Mobile push token not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateMobilePushTokenRoute = typeof createMobilePushToken;
export type GetMobilePushTokensRoute = typeof getMobilePushTokens;
export type UpdateMobilePushTokenRoute = typeof updateMobilePushToken;
export type DeleteMobilePushTokenRoute = typeof deleteMobilePushToken;
export type GetMobilePushTokenRoute = typeof getMobilePushToken;
