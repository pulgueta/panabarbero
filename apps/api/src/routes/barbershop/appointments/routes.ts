import { createRoute } from "@hono/zod-openapi";
import { STATUS_CODES } from "@panabarbero/constants/api";
import {
  appointmentSchema,
  createAppointmentSchema,
  createdResourceSchema,
  updateAppointmentSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { uuidParamsSchema, uuidQuerySchema } from "@/utils/schemas";

export const createAppointment = createRoute({
  method: "post",
  path: "/appointments",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(
      createAppointmentSchema,
      "The appointment to create",
    ),
  },
  responses: {
    [STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Appointment created",
    ),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createAppointmentSchema,
      "The appointment is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createAppointmentSchema,
      "Validation error",
    ),
  },
});

export const getAppointments = createRoute({
  method: "get",
  path: "/appointments",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      appointmentSchema.array(),
      "The existing appointments",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Appointments not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateAppointment = createRoute({
  method: "put",
  path: "/appointments",
  request: {
    query: uuidQuerySchema,
    body: requiredJsonContent(
      updateAppointmentSchema,
      "The appointment to update",
    ),
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(
      appointmentSchema,
      "The updated appointment",
    ),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateAppointmentSchema,
      "The appointment is not valid",
    ),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateAppointmentSchema,
      "Validation error",
    ),
  },
});

export const deleteAppointment = createRoute({
  method: "delete",
  path: "/appointments",
  request: {
    query: uuidQuerySchema,
  },
  responses: {
    [STATUS_CODES.OK]: defaultResponse("Appointment deleted"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getAppointment = createRoute({
  method: "get",
  path: "/appointments",
  request: {
    params: uuidParamsSchema,
  },
  responses: {
    [STATUS_CODES.OK]: jsonContent(appointmentSchema, "The appointment"),
    [STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      uuidParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateAppointmentRoute = typeof createAppointment;
export type GetAppointmentsRoute = typeof getAppointments;
export type UpdateAppointmentRoute = typeof updateAppointment;
export type DeleteAppointmentRoute = typeof deleteAppointment;
export type GetAppointmentRoute = typeof getAppointment;
