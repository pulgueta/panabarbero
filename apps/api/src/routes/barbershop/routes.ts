import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  barbershopSchema,
  barbershopWithOrganizationSchema,
  createBarbershopSchema,
  createdResourceSchema,
  updateBarbershopSchema,
} from "@panabarbero/db/schema/zod";
import { array } from "zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createBarbershop = createRoute({
  method: "post",
  path: "/barbershops",
  request: {
    body: requiredJsonContent(
      createBarbershopSchema,
      "The barbershop to create",
    ),
  },
  responses: {
    [api.STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Barbershop created",
    ),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createBarbershopSchema,
      "The barbershop is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createBarbershopSchema,
      "Validation error",
    ),
  },
});

export const getBarbershops = createRoute({
  method: "get",
  path: "/barbershops",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      array(barbershopWithOrganizationSchema),
      "The existing barbershops",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershops not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateBarbershop = createRoute({
  method: "put",
  path: "/barbershops",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(
      updateBarbershopSchema,
      "The barbershop to update",
    ),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      barbershopSchema,
      "The updated barbershop",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateBarbershopSchema,
      "The barbershop is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateBarbershopSchema,
      "Validation error",
    ),
  },
});

export const deleteBarbershop = createRoute({
  method: "delete",
  path: "/barbershops",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: defaultResponse("Barbershop deleted"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getBarbershop = createRoute({
  method: "get",
  path: "/barbershops",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(barbershopSchema, "The barbershop"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateBarbershopRoute = typeof createBarbershop;
export type GetBarbershopsRoute = typeof getBarbershops;
export type UpdateBarbershopRoute = typeof updateBarbershop;
export type DeleteBarbershopRoute = typeof deleteBarbershop;
export type GetBarbershopRoute = typeof getBarbershop;
