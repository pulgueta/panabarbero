import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
import { tables } from "./tables";

function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map((n) => Number(n));

  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;

  return hh * 60 + mm;
}

function minutesOfDay(ts: number): number {
  const d = new Date(ts);

  return d.getHours() * 60 + d.getMinutes();
}

function withinOpenHours(
  openAt: string | undefined,
  closeAt: string | undefined,
  startAt: number,
  endAt: number,
): boolean {
  if (!openAt || !closeAt) return true;

  const openMin = parseTimeToMinutes(openAt);
  const closeMin = parseTimeToMinutes(closeAt);

  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return true;

  const startMin = minutesOfDay(startAt);
  const endMin = minutesOfDay(endAt);

  return startMin >= openMin && endMin <= closeMin;
}

export const createAppointment = mutation({
  args: {
    appointment: v.object({
      ...tables.appointments,
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { appointment } = args;

    const appointmentOverlaps = await ctx.db
      .query("appointments")
      .filter(({ eq, field, and, lte, gte, or }) =>
        and(
          eq(field("barbershopId"), appointment.barbershopId),
          eq(field("barberId"), appointment.barberId),
          and(
            lte(field("startAt"), appointment.endAt),
            gte(field("endAt"), appointment.startAt),
          ),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .withIndex("by_barbershopId")
      .first();

    if (appointmentOverlaps) {
      throw new Error("Appointment overlaps with existing appointment");
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop) throw new Error("Barbershop not found");

    const date = new Date(appointment.date);
    const dayIdx = date.getDay();
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    const day = dayMap[dayIdx];
    const dayAvailability = barbershop.availability.find(
      (a) => a.weekDay.day === day,
    );

    if (!dayAvailability || !dayAvailability.weekDay.isActive) {
      throw new Error("Barbershop is closed on selected day");
    }

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    const appointmentId = await ctx.db.insert("appointments", appointment);

    const thirtyMinutesBeforeAppointment = appointment.startAt - 30 * 60 * 1000;

    await ctx.scheduler.runAt(
      thirtyMinutesBeforeAppointment,
      internal.appointments.notifyUpcomingAppointment,
      {
        appointmentId,
        barbershopId: appointment.barbershopId,
        userId: appointment.userId,
      },
    );

    return appointmentId;
  },
});

export const getAppointmentsByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .withIndex("by_userId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointmentsByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .withIndex("by_barbershopId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointments = query({
  handler: async (ctx) => {
    const appointments = await ctx.db.query("appointments").collect();

    return appointments;
  },
});

export const getAppointmentByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointment = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("uuid"), args.uuid))
      .withIndex("by_uuid")
      .unique();

    return appointment;
  },
});

export const getAppointmentByUserIdAndBarbershopId = query({
  args: {
    userId: v.string(),
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointment = await ctx.db
      .query("appointments")
      .filter(({ eq, field, and }) =>
        and(
          eq(field("userId"), args.userId),
          eq(field("barbershopId"), args.barbershopId),
        ),
      )
      .unique();

    return appointment;
  },
});

export const getAppointmentsByBarberId = query({
  args: {
    barberId: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("barberId"), args.barberId))
      .withIndex("by_barberId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointmentsByBarbershopAndRange = query({
  args: {
    barbershopId: v.id("barbershops"),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ and, gte, lte, field, eq }) =>
        and(
          eq(field("barbershopId"), args.barbershopId),
          lte(field("startAt"), args.endAt),
          gte(field("endAt"), args.startAt),
        ),
      )
      .withIndex("by_barbershopId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const setAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: tables.appointments.status,
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const updatedAppointment = await ctx.db.patch(args.appointmentId, {
      status: args.status,
    });
    const appt = await ctx.db.get(args.appointmentId);

    if (appt) {
      const titleMap: Record<string, string> = {
        confirmed: "Cita confirmada",
        cancelled: "Cita cancelada",
        completed: "Cita completada",
        "no-show": "Cita marcada como no asistió",
        rescheduled: "Cita reagendada",
        pending: "Cita pendiente",
      };

      const reasonMap: Record<
        string,
        (typeof tables.notifications)["reason"]["type"]
      > = {
        confirmed: "appointment_confirmed",
        cancelled: "appointment_cancelled",
        completed: "appointment_confirmed",
        "no-show": "appointment_no_show",
        rescheduled: "appointment_rescheduled",
        pending: "appointment_confirmed",
      } as const;
      const reason = reasonMap[args.status as keyof typeof reasonMap];
      const title =
        titleMap[args.status as keyof typeof titleMap] ??
        "Actualización de cita";
      const barber = await ctx.db.get(appt.barberId);

      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason,
        title,
        body: title,
        senderUserId: barber?.userId ?? "system",
        receiverUserId: appt.userId,
        appointmentId: args.appointmentId,
      });
    }

    return updatedAppointment;
  },
});

export const updateAppointment = mutation({
  args: {
    appointment: v.object({
      ...tables.appointments,
    }),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { appointment, appointmentId } = args;

    const original = await ctx.db.get(appointmentId);

    const overlap = await ctx.db
      .query("appointments")
      .filter(({ eq, field, and, lte, gte, or, neq }) =>
        and(
          eq(field("barbershopId"), appointment.barbershopId),
          eq(field("barberId"), appointment.barberId),
          neq(field("_id"), appointmentId),
          and(
            lte(field("startAt"), appointment.endAt),
            gte(field("endAt"), appointment.startAt),
          ),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .first();

    if (overlap) {
      throw new Error("Appointment overlaps with existing appointment");
    }

    const shop = await ctx.db.get(appointment.barbershopId);

    if (!shop) throw new Error("Barbershop not found");

    const date = new Date(appointment.date);
    const dayIdx = date.getDay();
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    const day = dayMap[dayIdx];
    const dayAvailability = shop.availability.find(
      (a) => a.weekDay.day === day,
    );

    if (!dayAvailability || !dayAvailability.weekDay.isActive) {
      throw new Error("Barbershop is closed on selected day");
    }

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    const updatedAppointment = await ctx.db.patch(appointmentId, appointment);
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.startAt !== appointment.startAt ||
          original.endAt !== appointment.endAt));

    const barber = await ctx.db.get(appointment.barberId);

    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason: "appointment_rescheduled",
        title: "Cita reagendada",
        body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.startAt).toLocaleDateString()}`,
        senderUserId: barber?.userId ?? "system",
        receiverUserId: appointment.userId,
        appointmentId,
      });
    }
    return updatedAppointment;
  },
});

export const deleteAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { appointmentId } = args;

    await ctx.db.delete(appointmentId);
  },
});

export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    cancelledByUserId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new Error("Appointment not found");

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason,
    });

    await ctx.db.insert("notifications", {
      uuid: crypto.randomUUID(),
      type: "sms",
      reason: "appointment_cancelled",
      title: "Cita cancelada",
      body: args.reason ?? "Tu cita ha sido cancelada.",
      senderUserId: args.cancelledByUserId,
      receiverUserId: appt.userId,
      appointmentId: args.appointmentId,
    });
  },
});

export const requestReschedule = mutation({
  args: {
    appointmentId: v.id("appointments"),
    proposedStartAt: v.number(),
    proposedEndAt: v.number(),
    requestedByUserId: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.auth.getUserIdentity();

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new Error("Appointment not found");

    await ctx.db.patch(args.appointmentId, {
      status: "rescheduled",
      notes: args.note,
      startAt: args.proposedStartAt,
      endAt: args.proposedEndAt,
    });

    await ctx.db.insert("notifications", {
      uuid: crypto.randomUUID(),
      type: "sms",
      reason: "appointment_rescheduled",
      title: "Solicitud de reagendamiento",
      body: "Se ha solicitado un reagendamiento para tu cita.",
      senderUserId: args.requestedByUserId,
      receiverUserId: appt.userId,
      appointmentId: args.appointmentId,
    });
    return null;
  },
});

export const notifyUpcomingAppointment = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    barbershopId: v.id("barbershops"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    await ctx.db.insert("notifications", {
      uuid: crypto.randomUUID(),
      type: "sms",
      reason: "appointment_reminder",
      title: "Recordatorio de cita",
      body: `Tienes una cita en ~30 minutos en ${barbershop?.name}`,
      senderUserId: "system",
      receiverUserId: args.userId,
      appointmentId: args.appointmentId,
    });
  },
});
