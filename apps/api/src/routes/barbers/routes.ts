import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  barberSchema,
  createBarberSchema,
  createdResourceSchema,
  updateBarberSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { idParamsSchema, idQuerySchema } from "@/utils/schemas";

export const createBarber = createRoute({
  method: "post",
  path: "/barbers",
  request: {
    body: requiredJsonContent(createBarberSchema, "The barber to create"),
  },
  responses: {
    [api.STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Barber created",
    ),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createBarberSchema,
      "The barber is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createBarberSchema,
      "Validation error",
    ),
  },
});

export const getBarbers = createRoute({
  method: "get",
  path: "/barbers",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      barberSchema.array(),
      "The existing barbers",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbers not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateBarber = createRoute({
  method: "put",
  path: "/barbers",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(updateBarberSchema, "The barber to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(barberSchema, "The updated barber"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateBarberSchema,
      "The barber is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateBarberSchema,
      "Validation error",
    ),
  },
});

export const deleteBarber = createRoute({
  method: "delete",
  path: "/barbers",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(barberSchema, "The barber to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(barberSchema, "The deleted barber"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getBarber = createRoute({
  method: "get",
  path: "/barbers/{id}",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(barberSchema, "The barber"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barber not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      idParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateBarberRoute = typeof createBarber;
export type GetBarbersRoute = typeof getBarbers;
export type UpdateBarberRoute = typeof updateBarber;
export type DeleteBarberRoute = typeof deleteBarber;
export type GetBarberRoute = typeof getBarber;
