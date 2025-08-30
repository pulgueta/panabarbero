import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  barbershopSchema,
  createBarbershopSchema,
  createdResourceSchema,
  updateBarbershopSchema,
} from "@panabarbero/db/schema/zod";
import { array } from "zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { idParamsSchema } from "@/utils/schemas";

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
  },
});

export const getBarbershops = createRoute({
  method: "get",
  path: "/barbershops",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      array(barbershopSchema),
      "The existing barbershops",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershops not found"),
  },
});

export const updateBarbershop = createRoute({
  method: "put",
  path: "/barbershops/{id}",
  request: {
    params: idParamsSchema,
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
  },
});

export const deleteBarbershop = createRoute({
  method: "delete",
  path: "/barbershops/{id}",
  request: {
    params: idParamsSchema,
    body: requiredJsonContent(barbershopSchema, "The barbershop to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      barbershopSchema,
      "The deleted barbershop",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
  },
});

export const getBarbershop = createRoute({
  method: "get",
  path: "/barbershops/{id}",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(barbershopSchema, "The barbershop"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershop not found"),
  },
});

export type CreateBarbershopRoute = typeof createBarbershop;
export type GetBarbershopsRoute = typeof getBarbershops;
export type UpdateBarbershopRoute = typeof updateBarbershop;
export type DeleteBarbershopRoute = typeof deleteBarbershop;
export type GetBarbershopRoute = typeof getBarbershop;
