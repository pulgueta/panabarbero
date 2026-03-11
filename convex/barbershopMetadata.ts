import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zQuery } from ".";
import { completedAppointmentsAggregate } from "./aggregates";
import { errorMessages } from "./errors";
import { appointments, barbershops } from "./schema";

export const createInitial = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const metadataId = await ctx.db.insert("barbershopMetadata", {
      uuid: crypto.randomUUID(),
      barbershopId: args.id,
      reviews: 0,
      rating: 0,
    });

    return metadataId;
  },
});

export const increaseBarbershopRating = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    // const reviews = await ctx.runQuery(api.reviews.getByBarbershopId, {
    //   barbershopId: args.id,
    // });

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbershop"));
    }

    // const averageRating =
    //   reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length;

    // if (barbershop.metadataId) {
    //   await ctx.db.patch(barbershop.metadataId, {
    //     rating: averageRating,
    //     reviews: reviews.length,
    //   });
    // }
  },
});

export const decrementCompletedAppointments = zInternalMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    appointmentId: appointments.tools.id.shape.id,
    appointmentDate: z.number(),
  }),
  handler: async (ctx, args) => {
    await completedAppointmentsAggregate.delete(ctx, {
      namespace: args.barbershopId,
      key: args.appointmentDate,
      id: args.appointmentId,
    });
  },
});

export const get = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .unique();

    if (!metadata) return null;

    const completedAppointments = await completedAppointmentsAggregate.count(
      ctx,
      { namespace: args.id },
    );

    return { ...metadata, completedAppointments };
  },
});

export const incrementCompletedAppointments = zInternalMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    appointmentId: appointments.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    await completedAppointmentsAggregate.insert(ctx, {
      namespace: args.barbershopId,
      key: appointment.date,
      id: args.appointmentId,
    });
  },
});
