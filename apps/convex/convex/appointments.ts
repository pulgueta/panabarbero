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
