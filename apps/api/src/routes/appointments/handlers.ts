import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { appointments } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreateAppointmentRoute,
  DeleteAppointmentRoute,
  GetAppointmentRoute,
  GetAppointmentsRoute,
  UpdateAppointmentRoute,
} from "./routes";

export const createAppointment: ApiHandler<CreateAppointmentRoute> = async (
  c,
) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(appointments)
    .values(json)
    .returning({ id: appointments.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getAppointments: ApiHandler<GetAppointmentsRoute> = async (c) => {
  const list = await db.query.appointments.findMany();

  if (!list || list.length === 0) {
    return c.json(
      { message: "Appointments not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getAppointment: ApiHandler<GetAppointmentRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const appointment = await db.query.appointments.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!appointment) {
    return c.json(
      { message: "Appointment not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(appointment, api.STATUS_CODES.OK);
};

export const updateAppointment: ApiHandler<UpdateAppointmentRoute> = async (
  c,
) => {
  const { id } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.appointments.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json(
      { message: "Appointment not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(appointments)
    .set(json)
    .where(eq(appointments.id, id))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteAppointment: ApiHandler<DeleteAppointmentRoute> = async (
  c,
) => {
  const { id } = c.req.valid("query");

  const existing = await db.query.appointments.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json(
      { message: "Appointment not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [deleted] = await db
    .delete(appointments)
    .where(eq(appointments.id, id))
    .returning();

  return c.json(deleted, api.STATUS_CODES.OK);
};
