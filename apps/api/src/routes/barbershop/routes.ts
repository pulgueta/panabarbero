import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants";
import {
  barbershopSchema,
  createBarbershopSchema,
  createdResourceSchema,
} from "@panabarbero/db/schema/zod";
import { array } from "zod";

import {
  badRequestFromSchema,
  jsonContent,
  requiredJsonContent,
} from "@/utils/parsers/json";
import { defaultResponse } from "@/utils/responses";

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
    [STATUS_CODES.BAD_REQUEST]: badRequestFromSchema(),
    // [STATUS_CODES.UNAUTHORIZED]: unauthorizedFromSchema(),
    // [STATUS_CODES.FORBIDDEN]: forbiddenFromSchema(),
    // [STATUS_CODES.NOT_FOUND]: notFoundFromSchema(),
    // [STATUS_CODES.INTERNAL_SERVER_ERROR]: internalServerErrorFromSchema(),
  },
});

export const getBarbershops = createRoute({
  method: "get",
  path: "/barbershops",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      array(barbershopSchema),
      "The existing barbershops",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Barbershops not found"),
  },
});

export const updateBarbershop = createRoute({
  method: "put",
  path: "/barbershops/{id}",
  responses: {
    [STATUS_CODES.OK]: jsonContent(barbershopSchema, "The updated barbershop"),
  },
});

export const deleteBarbershop = createRoute({
  method: "delete",
  path: "/barbershops/{id}",
  responses: {
    [STATUS_CODES.OK]: jsonContent(barbershopSchema, "The deleted barbershop"),
  },
});

export const getBarbershop = createRoute({
  method: "get",
  path: "/barbershops/{id}",
  responses: {
    [STATUS_CODES.OK]: jsonContent(barbershopSchema, "The barbershop"),
  },
});

export type CreateBarbershopRoute = typeof createBarbershop;
export type GetBarbershopsRoute = typeof getBarbershops;
export type UpdateBarbershopRoute = typeof updateBarbershop;
export type DeleteBarbershopRoute = typeof deleteBarbershop;
export type GetBarbershopRoute = typeof getBarbershop;
