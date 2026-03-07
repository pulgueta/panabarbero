/** Barbershop Member Services - Per-barber service assignment */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zMutation, zQuery } from ".";
import { authComponent } from "./auth";
import { assertCanManageShop, getBarbershopMemberByUserId } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { barbershopMembers, barbershops, services } from "./schema";

export const getBarbershopBarbers = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    const barbers = members.filter((member) => member.roles.includes("barber"));

    const barbersWithProfile = await Promise.all(
      barbers.map(async (barber) => {
        const profile = await ctx.db.get(barber.userProfileDataId);
        return {
          ...barber,
          name: profile?.name ?? "",
          email: profile?.email ?? "",
          phoneNumber: profile?.phoneNumber ?? "",
        };
      }),
    );

    return barbersWithProfile;
  },
});

/**
 * Get all services assigned to a specific barber
 */
export const getServicesForBarber = zQuery({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const memberServices = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
      )
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    const services = await Promise.all(
      memberServices.map(async (ms) => {
        const service = await ctx.db.get(ms.serviceId);

        return service;
      }),
    );

    return services;
  },
});

/**
 * Get all barbers who offer a specific service.
 * Only returns barbers who are explicitly assigned to this service.
 * No fallback to "all barbers" - assignments are mandatory.
 */
export const getBarbersForService = zQuery({
  args: services.tools.id,
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", args.id))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    if (assignments.length === 0) {
      return [];
    }

    const barbers = await Promise.all(
      assignments.map(async (a) => {
        const member = await ctx.db.get(a.barbershopMemberId);

        if (!member || !member.isActive) return null;

        const profile = await ctx.db.get(member.userProfileDataId);

        return {
          ...member,
          name: profile?.name ?? "",
          email: profile?.email ?? "",
          phoneNumber: profile?.phoneNumber ?? "",
        };
      }),
    );

    return barbers.filter((b) => b?.roles?.includes("barber"));
  },
});

/**
 * Get all services for a barbershop that are assigned to any barber
 * along with their assignment information
 */
export const getServicesWithBarberAssignments = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .collect();

    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .collect();

    return services.map((service) => {
      const serviceAssignments = assignments.filter(
        (a) => a.serviceId === service._id && a.isActive !== false,
      );
      return {
        ...service,
        assignedBarberIds: serviceAssignments.map((a) => a.barbershopMemberId),
      };
    });
  },
});

/**
 * Set the services that a barber can perform
 * Only owners can assign services to barbers
 */
export const setBarberServices = zMutation({
  args: z.object({
    barbershopMember: barbershopMembers.tools.id,
    services: z.array(services.tools.id),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "setBarberServices", user._id);

    const member = await ctx.db.get(args.barbershopMember.id);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    if (!member.roles.includes("barber")) {
      throw new ConvexError("El miembro seleccionado no es un barbero");
    }

    for (const { id } of args.services) {
      const service = await ctx.db.get(id);

      if (!service) {
        return;
      }
      if (service.barbershopId !== member.barbershopId) {
        throw new ConvexError("El servicio no pertenece a esta barbería");
      }
    }

    const existingAssignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMember.id),
      )
      .collect();

    const existingServiceIds = existingAssignments.map((a) => a.serviceId);

    const servicesToAdd = args.services.filter(
      (service) => !existingServiceIds.includes(service.id),
    );

    const servicesToRemove = existingAssignments.filter(
      (a) => !args.services.some((s) => s.id === a.serviceId),
    );
    const servicesToReactivate = existingAssignments.filter(
      (a) =>
        args.services.some((s) => s.id === a.serviceId) && a.isActive === false,
    );

    for (const service of servicesToAdd) {
      await ctx.db.insert("barbershopMemberServices", {
        uuid: crypto.randomUUID(),
        barbershopId: member.barbershopId,
        barbershopMemberId: args.barbershopMember.id,
        serviceId: service.id,
        isActive: true,
      });
    }

    for (const assignment of servicesToRemove) {
      await ctx.db.patch(assignment._id, { isActive: false });
    }

    for (const assignment of servicesToReactivate) {
      await ctx.db.patch(assignment._id, { isActive: true });
    }
  },
});

/**
 * Add a service to a barber's available services
 */
export const addServiceToBarber = zMutation({
  args: z.object({
    barbershopMember: barbershopMembers.tools.id,
    service: services.tools.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "addServiceToBarber", user._id);

    const member = await ctx.db.get(args.barbershopMember.id);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    const service = await ctx.db.get(args.service.id);
    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }
    if (service.barbershopId !== member.barbershopId) {
      throw new ConvexError("El servicio no pertenece a esta barbería");
    }

    const existing = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMember.id),
      )
      .filter((q) => q.eq(q.field("serviceId"), args.service.id))
      .first();

    if (existing) {
      if (existing.isActive === false) {
        await ctx.db.patch(existing._id, { isActive: true });
      }
      return existing._id;
    }

    return await ctx.db.insert("barbershopMemberServices", {
      uuid: crypto.randomUUID(),
      barbershopId: member.barbershopId,
      barbershopMemberId: args.barbershopMember.id,
      serviceId: args.service.id,
      isActive: true,
    });
  },
});

/**
 * Remove a service from a barber's available services
 */
export const removeServiceFromBarber = zMutation({
  args: z.object({
    barbershopMember: barbershopMembers.tools.id,
    service: services.tools.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeServiceFromBarber", user._id);

    const member = await ctx.db.get(args.barbershopMember.id);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    const service = await ctx.db.get(args.service.id);
    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }
    if (service.barbershopId !== member.barbershopId) {
      throw new ConvexError("El servicio no pertenece a esta barbería");
    }

    const assignment = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMember.id),
      )
      .filter((q) => q.eq(q.field("serviceId"), args.service.id))
      .first();

    if (assignment) {
      await ctx.db.patch(assignment._id, { isActive: false });
    }
  },
});

export const assignAllServicesToBarber = zInternalMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", member.barbershopId),
      )
      .collect();

    const existingAssignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.id),
      )
      .collect();

    const existingServiceIds = new Set(
      existingAssignments.map((a) => a.serviceId),
    );

    for (const service of services) {
      if (!existingServiceIds.has(service._id)) {
        await ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: member.barbershopId,
          barbershopMemberId: args.id,
          serviceId: service._id,
          isActive: true,
        });
      }
    }

    for (const assignment of existingAssignments) {
      if (assignment.isActive === false) {
        await ctx.db.patch(assignment._id, { isActive: true });
      }
    }
  },
});

/**
 * Get the current user's services if they are a barber
 */
export const getMyServices = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return [];
    }

    const member = await getBarbershopMemberByUserId(ctx, args.id, user.userId);

    if (!member || !member.roles.includes("barber")) {
      return [];
    }

    const memberServices = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", member._id),
      )
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    const services = await Promise.all(
      memberServices.map(async (ms) => {
        const service = await ctx.db.get(ms.serviceId);
        return service;
      }),
    );

    return services;
  },
});
