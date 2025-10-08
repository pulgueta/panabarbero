import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
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
  if (!openAt || !closeAt) return true; // No explicit window set
  const openMin = parseTimeToMinutes(openAt);
  const closeMin = parseTimeToMinutes(closeAt);
  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return true;
  // Same-day windows only
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

    return appointmentId;
  },
});

export const getAppointmentsByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
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
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .withIndex("by_barbershopId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointmentByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
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
    const updatedAppointment = await ctx.db.patch(args.appointmentId, {
      status: args.status,
    });
    // Emit notification on status change
    const appt = await ctx.db.get(args.appointmentId);
    if (appt) {
      const titleMap: Record<string, string> = {
        confirmed: "Appointment confirmed",
        cancelled: "Appointment cancelled",
        completed: "Appointment completed",
        "no-show": "Appointment marked as no-show",
        rescheduled: "Appointment rescheduled",
        pending: "Appointment pending",
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
        titleMap[args.status as keyof typeof titleMap] ?? "Appointment update";
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason,
        title,
        body: title,
        senderUserId: await (async () => {
          const barber = await ctx.db.get(appt.barberId);
          // barber table stores userId
          return (barber as any)?.userId ?? "system";
        })(),
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
    // Emit rescheduled notification if status set to rescheduled or time changed
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.startAt !== appointment.startAt ||
          original.endAt !== appointment.endAt));
    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason: "appointment_rescheduled",
        title: "Appointment rescheduled",
        body: "Your appointment has been rescheduled.",
        senderUserId: await (async () => {
          const barber = await ctx.db.get(appointment.barberId);
          return (barber as any)?.userId ?? "system";
        })(),
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
      title: "Appointment cancelled",
      body: args.reason ?? "Your appointment was cancelled.",
      senderUserId: args.cancelledByUserId,
      receiverUserId: appt.userId,
      appointmentId: args.appointmentId,
    });
    return null;
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
      title: "Reschedule requested",
      body: "A reschedule has been requested for your appointment.",
      senderUserId: args.requestedByUserId,
      receiverUserId: appt.userId,
      appointmentId: args.appointmentId,
    });
    return null;
  },
});
