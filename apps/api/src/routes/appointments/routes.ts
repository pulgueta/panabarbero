import { createRoute } from "@hono/zod-openapi";
import { api } from "@panabarbero/constants";
import {
  appointmentSchema,
  createAppointmentSchema,
  createdResourceSchema,
  updateAppointmentSchema,
} from "@panabarbero/db/schema/zod";

import { jsonContent, requiredJsonContent } from "@/utils/parsers/json";
import { createErrorSchema, defaultResponse } from "@/utils/responses";
import { idParamsSchema, idQuerySchema } from "@/utils/schemas";

export const createAppointment = createRoute({
  method: "post",
  path: "/appointments",
  request: {
    body: requiredJsonContent(
      createAppointmentSchema,
      "The appointment to create",
    ),
  },
  responses: {
    [api.STATUS_CODES.CREATED]: jsonContent(
      createdResourceSchema,
      "Appointment created",
    ),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      createAppointmentSchema,
      "The appointment is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      createAppointmentSchema,
      "Validation error",
    ),
  },
});

export const getAppointments = createRoute({
  method: "get",
  path: "/appointments",
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      appointmentSchema.array(),
      "The existing appointments",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Appointments not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const updateAppointment = createRoute({
  method: "put",
  path: "/appointments",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(
      updateAppointmentSchema,
      "The appointment to update",
    ),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      appointmentSchema,
      "The updated appointment",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [api.STATUS_CODES.BAD_REQUEST]: createErrorSchema(
      updateAppointmentSchema,
      "The appointment is not valid",
    ),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      updateAppointmentSchema,
      "Validation error",
    ),
  },
});

export const deleteAppointment = createRoute({
  method: "delete",
  path: "/appointments",
  request: {
    query: idQuerySchema,
    body: requiredJsonContent(appointmentSchema, "The appointment to update"),
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(
      appointmentSchema,
      "The deleted appointment",
    ),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
  },
});

export const getAppointment = createRoute({
  method: "get",
  path: "/appointments/{id}",
  request: {
    params: idParamsSchema,
  },
  responses: {
    [api.STATUS_CODES.OK]: jsonContent(appointmentSchema, "The appointment"),
    [api.STATUS_CODES.NOT_FOUND]: defaultResponse("Appointment not found"),
    [api.STATUS_CODES.UNAUTHORIZED]: defaultResponse("Unauthorized"),
    [api.STATUS_CODES.FORBIDDEN]: defaultResponse("Forbidden"),
    [api.STATUS_CODES.UNPROCESSABLE_ENTITY]: createErrorSchema(
      idParamsSchema,
      "Validation error",
    ),
  },
});

export type CreateAppointmentRoute = typeof createAppointment;
export type GetAppointmentsRoute = typeof getAppointments;
export type UpdateAppointmentRoute = typeof updateAppointment;
export type DeleteAppointmentRoute = typeof deleteAppointment;
export type GetAppointmentRoute = typeof getAppointment;
