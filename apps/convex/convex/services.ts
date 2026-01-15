/** biome-ignore-all lint/style/noNonNullAssertion: is always provided */

import type { SearchEntry, SearchResult } from "@convex-dev/rag";
import type { EmbeddingModelUsage } from "ai";
import type { Value } from "convex/values";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageServices, assertCanManageShop } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { tables } from "./tables";

type ServiceResult = {
  results: SearchResult[];
  text: string;
  entries: SearchEntry<Record<string, Value>, Record<string, Value>>[];
  usage: EmbeddingModelUsage;
};

export const search = action({
  args: {
    service: v.string(),
  },
  handler: async (ctx, args): Promise<ServiceResult> => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "searchServices", user._id);

    const serviceResults = await ctx.runAction(internal.rag.search, {
      namespace: "services",
      query: args.service,
      userId: user.userId ?? undefined,
    });

    return serviceResults;
  },
});

export const createMutation = internalMutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.service.barbershopId);

    if (barbershop && barbershop.isActive === false) {
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.service.barbershopId),
        )
        .first();

      if (!existingService) {
        await ctx.db.patch(args.service.barbershopId, {
          isActive: true,
        });
      }
    }

    const serviceId = await ctx.db.insert("services", args.service);

    // Auto-assign service to the only barber if there's only one owner-barber member
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.service.barbershopId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (members.length === 1) {
      const onlyMember = members[0];
      const isOwnerAndBarber =
        onlyMember.roles.includes("owner") &&
        onlyMember.roles.includes("barber");

      if (isOwnerAndBarber) {
        // Auto-assign service to the only owner-barber
        await ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: args.service.barbershopId,
          barbershopMemberId: onlyMember._id,
          serviceId,
          isActive: true,
        });
      }
    }

    return serviceId;
  },
});

export const create = mutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "createService", user._id);

    const { service } = args;

    // Verify the user has permission to create services (owner or barber)
    await assertCanManageServices(ctx, service.barbershopId, user.userId);

    const barbershop = await ctx.db.get(service.barbershopId);

    if (!barbershop?.isActive) {
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", service.barbershopId),
        )
        .first();

      if (!existingService) {
        await ctx.db.patch(service.barbershopId, {
          isActive: true,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.rag.add, {
      namespace: "services",
      text: service.name,
      userId: user.userId,
    });

    const serviceId = await ctx.db.insert("services", service);

    // Auto-assign service to the only barber if there's only one owner-barber member
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", service.barbershopId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (members.length === 1) {
      const onlyMember = members[0];
      const isOwnerAndBarber =
        onlyMember.roles.includes("owner") &&
        onlyMember.roles.includes("barber");

      if (isOwnerAndBarber) {
        // Auto-assign service to the only owner-barber
        await ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: service.barbershopId,
          barbershopMemberId: onlyMember._id,
          serviceId,
          isActive: true,
        });
      }
    }

    return serviceId;
  },
});

export const getByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    return service;
  },
});

export const getById = query({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.serviceId);
  },
});

export const getByIds = query({
  args: {
    serviceIds: v.array(v.id("services")),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.serviceIds.map(async (serviceId) => await ctx.db.get(serviceId)),
    );
  },
});

export const update = mutation({
  args: {
    service: v.object({
      name: v.string(),
      price: v.number(),
      duration: v.number(),
      barbershopId: v.id("barbershops"),
    }),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateService", user._id);

    const { service, serviceId } = args;

    // Only owners can update services
    await assertCanManageShop(ctx, service.barbershopId, user.userId);

    await ctx.db.patch(serviceId, {
      ...service,
      uuid: crypto.randomUUID(),
    });
  },
});

/**
 * Delete a service with 2-step confirmation if future appointments exist.
 *
 * - If `force` is false/undefined and impacted appointments exist:
 *   throws ConvexError with message "WILL_CANCEL:N" where N is count of impacted appointments.
 * - If `force` is true: cancels/soft-deletes all impacted appointments, notifies customers, then deletes service.
 */
export const deleteService = mutation({
  args: {
    barbershopId: v.id("barbershops"),
    serviceId: v.id("services"),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "deleteService", user._id);

    const { serviceId, barbershopId, force } = args;

    // Only owners can delete services
    await assertCanManageShop(ctx, barbershopId, user.userId);

    const service = await ctx.db.get(serviceId);
    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    if (service.barbershopId !== barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const now = Date.now();

    // Find impacted appointments: future/upcoming, not deleted, not cancelled/completed/no-show
    const impactedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.gte(q.field("date"), now),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
        ),
      )
      .collect();

    // 2-step confirmation: if not force and impacted > 0, throw error with count
    if (!force && impactedAppointments.length > 0) {
      throw new ConvexError(`WILL_CANCEL:${impactedAppointments.length}`);
    }

    // If force or no impacted appointments, proceed with deletion
    const barbershop = await ctx.db.get(barbershopId);

    // Cancel and soft-delete impacted appointments, notify customers
    for (const appt of impactedAppointments) {
      await ctx.db.patch(appt._id, {
        status: "cancelled",
        deletedAt: Date.now(),
        notes: `Servicio "${service.name}" eliminado por la barbería`,
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });

      // Send notification to customer
      await ctx.runMutation(
        internal.notifications.createServiceDeletedCancellation,
        {
          appointmentId: appt._id,
          customerUserId: appt.userId,
          serviceName: service.name,
          barbershopName: barbershop?.name ?? "la barbería",
          contactPhone: appt.contactPhone,
          contactEmail: appt.contactEmail,
        },
      );
    }

    // Delete all barber-service assignments for this service
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
      .collect();

    for (const assignment of assignments) {
      await ctx.db.delete(assignment._id);
    }

    // Finally delete the service
    await ctx.db.delete(serviceId);

    return { deletedAppointments: impactedAppointments.length };
  },
});

export const getByAppointmentId = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      return null;
    }

    return await ctx.db.get(appointment.serviceId);
  },
});
