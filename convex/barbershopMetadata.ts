import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import { api } from "./_generated/api";
import { completedAppointmentsAggregate } from "./aggregates";
import { authComponent } from "./auth";
import { assertOwner } from "./authz";
import { errorMessages } from "./errors";
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

export const setLogoKey = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    logoKey: z.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await assertOwner(ctx, args.barbershopId, user.userId);
    await rateLimitOrThrow(ctx, "uploadBarbershopLogo", user.userId);

    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();

    if (!metadata) {
      throw new ConvexError(errorMessages.notFound("metadata de barbería"));
    }

    if (metadata.logoKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: metadata.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(metadata._id, { logoKey: args.logoKey });
  },
});

export const removeLogoKey = zMutation({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await assertOwner(ctx, args.barbershopId, user.userId);
    await rateLimitOrThrow(ctx, "removeBarbershopLogo", user.userId);

    const metadata = await ctx.db
      .query("barbershopMetadata")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .unique();

    if (!metadata) {
      throw new ConvexError(errorMessages.notFound("metadata de barbería"));
    }

    if (metadata.logoKey) {
      try {
        await ctx.runMutation(api.r2.deleteR2Object, {
          key: metadata.logoKey,
        });
      } catch {
        // Non-fatal: old object may already be gone
      }
    }

    await ctx.db.patch(metadata._id, { logoKey: undefined });
  },
});
