import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import { completedAppointmentsAggregate } from "./aggregates";
import { authComponent } from "./auth";
import { assertOwner } from "./authz";
import { errorMessages } from "./errors";
import { barbershopGeospatial } from "./geospatial";
import { rateLimitOrThrow } from "./ratelimit";
import { appointments, barbershops } from "./schema";

export const createInitial = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const metadataId = await ctx.db.insert("barbershopMetadata", {
      barbershopId: args.id,
    });

    return metadataId;
  },
});

export const increaseBarbershopRating = zInternalMutation({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    // TODO: Implement aggregate component for rating

    const barbershop = await ctx.db.get(args.id);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbershop"));
    }
  },
});

export const decrementCompletedAppointments = zInternalMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    appointmentId: appointments.tools.id.shape.id,
    appointmentDate: z.number(),
  }),
  handler: async (ctx, args) => {
    await completedAppointmentsAggregate.deleteIfExists(ctx, {
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

/** Public: the barbershop's coordinates, read from the geospatial index. */
export const getLocation = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const doc = await barbershopGeospatial.get(ctx, args.id);

    return doc ? doc.coordinates : null;
  },
});

/** Owner-only: set (or move) the barbershop's location. */
export const setLocation = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      assertOwner(ctx, args.barbershopId, user.userId),
      rateLimitOrThrow(ctx, "updateBarbershop", user.userId),
    ]);

    const location = { latitude: args.latitude, longitude: args.longitude };

    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();

    if (metadata) {
      await ctx.db.patch(metadata._id, { location });
    } else {
      await ctx.db.insert("barbershopMetadata", {
        barbershopId: args.barbershopId,
        location,
      });
    }

    await barbershopGeospatial.insert(ctx, args.barbershopId, location, {});
  },
});

/** Owner-only: clear the barbershop's location. */
export const removeLocation = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      assertOwner(ctx, args.barbershopId, user.userId),
      rateLimitOrThrow(ctx, "updateBarbershop", user.userId),
    ]);

    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();

    if (metadata) {
      await ctx.db.patch(metadata._id, { location: undefined });
    }

    await barbershopGeospatial.remove(ctx, args.barbershopId);
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
