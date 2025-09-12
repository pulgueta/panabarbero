import { STATUS_CODES } from "@panabarbero/constants/api";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { appointments } from "@panabarbero/db/schema";
import type {
  Appointment,
  AppointmentWithRelations,
} from "@panabarbero/db/schema/zod";
import {
  appointmentSchema,
  appointmentWithRelationsSchema,
} from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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
  const { uuid } = c.req.valid("query");

  const [created] = await db
    .insert(appointments)
    .values({ ...json, barbershopId: uuid })
    .returning({ id: appointments.uuid });

  await setCacheFromKey(`appointments:${created.id}`, created);

  return c.json({ id: created.id }, STATUS_CODES.CREATED);
};

export const getAppointments: ApiHandler<GetAppointmentsRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  let appointments: AppointmentWithRelations[] | undefined;

  const cachedAppointments = await getCacheFromKey(
    `appointments_with_relations:${uuid}`,
    appointmentWithRelationsSchema.array(),
  );

  if (cachedAppointments) {
    appointments = cachedAppointments;
  } else {
    appointments = await db.query.appointments.findMany({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
      with: {
        service: true,
        barbershop: true,
      },
    });
  }

  if (appointments) {
    return c.json(appointments, STATUS_CODES.OK);
  }

  await setCacheFromKey(`appointments_with_relations:${uuid}`, appointments);

  return c.json(appointments, STATUS_CODES.OK);
};

export const getAppointment: ApiHandler<GetAppointmentRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let appointment: Appointment | undefined;

  const cachedAppointment = await getCacheFromKey(
    `appointments:${uuid}`,
    appointmentSchema,
  );

  if (cachedAppointment) {
    appointment = cachedAppointment;
  } else {
    appointment = await db.query.appointments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey(`appointments:${uuid}`, appointment);

  return c.json(appointment, STATUS_CODES.OK);
};

export const updateAppointment: ApiHandler<UpdateAppointmentRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let appointment: Appointment | undefined;

  const cachedAppointment = await getCacheFromKey(
    `appointments:${uuid}`,
    appointmentSchema,
  );

  if (cachedAppointment) {
    appointment = cachedAppointment;
  } else {
    appointment = await db.query.appointments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(appointments)
    .set(json)
    .where(eq(appointments.uuid, uuid))
    .returning({
      userId: appointments.userId,
      barbershopId: appointments.barbershopId,
      serviceId: appointments.serviceId,
      barberId: appointments.barberId,
      date: appointments.date,
      startAt: appointments.startAt,
      endAt: appointments.endAt,
      status: appointments.status,
      notes: appointments.notes,
      uuid: appointments.uuid,
    });

  await setCacheFromKey(`appointments:${uuid}`, updated);

  return c.json(updated, STATUS_CODES.OK);
};

export const deleteAppointment: ApiHandler<DeleteAppointmentRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");

  let appointment: Appointment | undefined;

  const cachedAppointment = await getCacheFromKey(
    `appointments:${uuid}`,
    appointmentSchema,
  );

  if (cachedAppointment) {
    appointment = cachedAppointment;
  } else {
    appointment = await db.query.appointments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!appointment) {
    return c.json({ message: "Appointment not found" }, STATUS_CODES.NOT_FOUND);
  }

  await Promise.all([
    db.delete(appointments).where(eq(appointments.uuid, uuid)).returning(),
    deleteCacheFromKey(`appointments:${uuid}`),
  ]);

  return c.json({ message: "Appointment deleted" }, STATUS_CODES.OK);
};
