import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
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
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Payment created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createPaymentSchema,
      "The payment is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createPaymentSchema,
      "Validation error",
    ),
  },
});

export const getPayments = createRoute({
  method: "get",
  path: "/payments",
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      paymentSchema.array(),
      "The existing payments",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Payments not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
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
    [STATUS_CODES.OK]: jsonContent(paymentSchema, "The updated payment"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updatePaymentSchema,
      "The payment is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
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
    [STATUS_CODES.OK]: defaultResponse("Payment deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getPayment = createRoute({
  method: "get",
  path: "/payments",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(paymentSchema, "The payment"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Payment not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
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
