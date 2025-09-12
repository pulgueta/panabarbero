import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  barberSchema,
  createBarberSchema,
  createdResourceSchema,
  updateBarberSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createBarber = createRoute({
  method: "post",
  path: "/barbers",
  request: {
    body: requiredJsonContent(createBarberSchema, "The barber to create"),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Barber created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createBarberSchema,
      "The barber is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createBarberSchema,
      "Validation error",
    ),
  },
});

export const getBarbers = createRoute({
  method: "get",
  path: "/barbers",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      barberSchema.array(),
      "The existing barbers",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbers not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateBarber = createRoute({
  method: "put",
  path: "/barbers",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(updateBarberSchema, "The barber to update"),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(barberSchema, "The updated barber"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateBarberSchema,
      "The barber is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateBarberSchema,
      "Validation error",
    ),
  },
});

export const deleteBarber = createRoute({
  method: "delete",
  path: "/barbers",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Barber deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getBarber = createRoute({
  method: "get",
  path: "/barbers",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(barberSchema, "The barber"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateBarberRoute = typeof createBarber;
export type GetBarbersRoute = typeof getBarbers;
export type UpdateBarberRoute = typeof updateBarber;
export type DeleteBarberRoute = typeof deleteBarber;
export type GetBarberRoute = typeof getBarber;
