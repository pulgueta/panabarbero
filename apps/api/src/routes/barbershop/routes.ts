import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
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
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Barbershop created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createBarbershopSchema,
      "The barbershop is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createBarbershopSchema,
      "Validation error",
    ),
  },
});

export const getBarbershops = createRoute({
  method: "get",
  path: "/barbershops",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      array(barbershopWithOrganizationSchema),
      "The existing barbershops",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershops not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
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
    [STATUS_CODES.OK]: jsonContent(barbershopSchema, "The updated barbershop"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateBarbershopSchema,
      "The barbershop is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
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
    [STATUS_CODES.OK]: defaultResponse("Barbershop deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getBarbershop = createRoute({
  method: "get",
  path: "/barbershops",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(barbershopSchema, "The barbershop"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
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
