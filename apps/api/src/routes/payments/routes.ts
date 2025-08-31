import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  createdResourceSchema,
  createPaymentSchema,
  paymentSchema,
  updatePaymentSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createPayment = createRoute({
  method: "post",
  path: "/payments",
  request: {
    body: requiredJsonContent(createPaymentSchema, "The payment to create"),
  },
  responses: {
    [api.STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Payment created",
    ),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createPaymentSchema,
      "The payment is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createPaymentSchema,
      "Validation error",
    ),
  },
});

export const getPayments = createRoute({
  method: "get",
  path: "/payments",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      paymentSchema.array(),
      "The existing payments",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Payments not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updatePayment = createRoute({
  method: "put",
  path: "/payments",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(updatePaymentSchema, "The payment to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(paymentSchema, "The updated payment"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updatePaymentSchema,
      "The payment is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updatePaymentSchema,
      "Validation error",
    ),
  },
});

export const deletePayment = createRoute({
  method: "delete",
  path: "/payments",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(paymentSchema, "The deleted payment"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getPayment = createRoute({
  method: "get",
  path: "/payments/{uuid}",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(paymentSchema, "The payment"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreatePaymentRoute = typeof createPayment;
export type GetPaymentsRoute = typeof getPayments;
export type UpdatePaymentRoute = typeof updatePayment;
export type DeletePaymentRoute = typeof deletePayment;
export type GetPaymentRoute = typeof getPayment;
