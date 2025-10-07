import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

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
          and(
            lte(field("startAt"), appointment.endAt),
            gte(field("endAt"), appointment.startAt),
          ),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .first();

    if (appointmentOverlaps) {
      throw new Error("Appointment overlaps with existing appointment");
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

export const updateAppointment = mutation({
  args: {
    appointment: v.object({
      ...tables.appointments,
    }),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const { appointment, appointmentId } = args;

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
