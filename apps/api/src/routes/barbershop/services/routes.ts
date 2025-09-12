import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  createdResourceSchema,
  createServiceSchema,
  serviceSchema,
  updateServiceSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createService = createRoute({
  method: "post",
  path: "/services",
  request: {
    body: requiredJsonContent(createServiceSchema, "The service to create"),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Service created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createServiceSchema,
      "The service is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createServiceSchema,
      "Validation error",
    ),
  },
});

export const getServices = createRoute({
  method: "get",
  path: "/services",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      serviceSchema.array(),
      "The existing services",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Services not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateService = createRoute({
  method: "put",
  path: "/services",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(updateServiceSchema, "The service to update"),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(serviceSchema, "The updated service"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Service not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateServiceSchema,
      "The service is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateServiceSchema,
      "Validation error",
    ),
  },
});

export const deleteService = createRoute({
  method: "delete",
  path: "/services",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Service deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Service not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getService = createRoute({
  method: "get",
  path: "/services",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(serviceSchema, "The service"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Service not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateServiceRoute = typeof createService;
export type GetServicesRoute = typeof getServices;
export type UpdateServiceRoute = typeof updateService;
export type DeleteServiceRoute = typeof deleteService;
export type GetServiceRoute = typeof getService;
