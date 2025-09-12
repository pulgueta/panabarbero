import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  createdResourceSchema,
  createNotificationSchema,
  notificationSchema,
  updateNotificationSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createNotification = createRoute({
  method: "post",
  path: "/notifications",
  request: {
    body: requiredJsonContent(
      createNotificationSchema,
      "The notification to create",
    ),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Notification created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createNotificationSchema,
      "The notification is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createNotificationSchema,
      "Validation error",
    ),
  },
});

export const getNotifications = createRoute({
  method: "get",
  path: "/notifications",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      notificationSchema.array(),
      "The existing notifications",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Notifications not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateNotification = createRoute({
  method: "put",
  path: "/notifications",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(
      updateNotificationSchema,
      "The notification to update",
    ),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      notificationSchema,
      "The updated notification",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Notification not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateNotificationSchema,
      "The notification is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateNotificationSchema,
      "Validation error",
    ),
  },
});

export const deleteNotification = createRoute({
  method: "delete",
  path: "/notifications",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Notification deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Notification not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getNotification = createRoute({
  method: "get",
  path: "/notifications",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(notificationSchema, "The notification"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Notification not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateNotificationRoute = typeof createNotification;
export type GetNotificationsRoute = typeof getNotifications;
export type UpdateNotificationRoute = typeof updateNotification;
export type DeleteNotificationRoute = typeof deleteNotification;
export type GetNotificationRoute = typeof getNotification;
