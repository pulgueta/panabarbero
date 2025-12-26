/** Barbershop Member Services - Per-barber service assignment */

import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { assertCanManageShop, getBarbershopMemberByUserId } from "./authz";
import { errorMessages } from "./errors";
import type { Service } from "./tables";

/**
 * Get all barbers (members with barber role) for a barbershop
 */
export const getBarbershopBarbers = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Filter members who have the "barber" role
    const barbers = members.filter((member) => member.roles.includes("barber"));

    // Get profile data for each barber
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
export const getServicesForBarber = query({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
  },
  handler: async (ctx, args) => {
    const memberServices = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
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
 * Get all barbers who offer a specific service
 */
export const getBarbersForService = query({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    // Get all assignments for this service
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", args.serviceId))
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();

    if (assignments.length === 0) {
      // If no explicit assignments, return all barbers (legacy/migration support)
      const service = await ctx.db.get(args.serviceId);
      if (!service) return [];

      const members = await ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", service.barbershopId),
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect();

      const barbers = members.filter((m) => m.roles.includes("barber"));

      return Promise.all(
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
    }

    // Get barber details for each assignment
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

    return barbers.filter(
      (b): b is NonNullable<typeof b> => !!b?.roles?.includes("barber"),
    );
  },
});

/**
 * Get all services for a barbershop that are assigned to any barber
 * along with their assignment information
 */
export const getServicesWithBarberAssignments = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    // Get all services for the barbershop
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    // Get all service assignments for the barbershop
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .collect();

    // Map services with their assigned barbers
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
export const setBarberServices = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
    serviceIds: v.array(v.id("services")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Get the barbershop member to find the barbershop
    const member = await ctx.db.get(args.barbershopMemberId);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    // Verify the user is an owner of the barbershop
    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    // Verify the target member is a barber
    if (!member.roles.includes("barber")) {
      throw new ConvexError("El miembro seleccionado no es un barbero");
    }

    // Get existing service assignments for this barber
    const existingAssignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .collect();

    const existingServiceIds = existingAssignments.map((a) => a.serviceId);

    // Determine which services to add and which to remove/deactivate
    const servicesToAdd = args.serviceIds.filter(
      (id) => !existingServiceIds.includes(id),
    );
    const servicesToRemove = existingAssignments.filter(
      (a) => !args.serviceIds.includes(a.serviceId),
    );
    const servicesToReactivate = existingAssignments.filter(
      (a) => args.serviceIds.includes(a.serviceId) && a.isActive === false,
    );

    // Add new service assignments
    for (const serviceId of servicesToAdd) {
      await ctx.db.insert("barbershopMemberServices", {
        uuid: crypto.randomUUID(),
        barbershopId: member.barbershopId,
        barbershopMemberId: args.barbershopMemberId,
        serviceId,
        isActive: true,
      });
    }

    // Deactivate removed assignments
    for (const assignment of servicesToRemove) {
      await ctx.db.patch(assignment._id, { isActive: false });
    }

    // Reactivate reactivated assignments
    for (const assignment of servicesToReactivate) {
      await ctx.db.patch(assignment._id, { isActive: true });
    }

    return { success: true };
  },
});

/**
 * Add a service to a barber's available services
 */
export const addServiceToBarber = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await ctx.db.get(args.barbershopMemberId);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    // Verify the user is an owner of the barbershop
    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    // Check if assignment already exists
    const existing = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .filter((q) => q.eq(q.field("serviceId"), args.serviceId))
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
      barbershopMemberId: args.barbershopMemberId,
      serviceId: args.serviceId,
      isActive: true,
    });
  },
});

/**
 * Remove a service from a barber's available services
 */
export const removeServiceFromBarber = mutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await ctx.db.get(args.barbershopMemberId);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    // Verify the user is an owner of the barbershop
    await assertCanManageShop(ctx, member.barbershopId, user.userId);

    const assignment = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .filter((q) => q.eq(q.field("serviceId"), args.serviceId))
      .first();

    if (assignment) {
      await ctx.db.patch(assignment._id, { isActive: false });
    }

    return { success: true };
  },
});

/**
 * Assign all services of a barbershop to a barber
 * Useful when adding a new barber who should have access to all services
 */
export const assignAllServicesToBarber = internalMutation({
  args: {
    barbershopMemberId: v.id("barbershopMembers"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.barbershopMemberId);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    // Get all services for the barbershop
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", member.barbershopId),
      )
      .collect();

    // Get existing assignments
    const existingAssignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .collect();

    const existingServiceIds = new Set(
      existingAssignments.map((a) => a.serviceId),
    );

    // Add assignments for services that don't have one
    for (const service of services) {
      if (!existingServiceIds.has(service._id)) {
        await ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: member.barbershopId,
          barbershopMemberId: args.barbershopMemberId,
          serviceId: service._id,
          isActive: true,
        });
      }
    }

    // Reactivate deactivated assignments
    for (const assignment of existingAssignments) {
      if (assignment.isActive === false) {
        await ctx.db.patch(assignment._id, { isActive: true });
      }
    }

    return { success: true };
  },
});

/**
 * Get the current user's services if they are a barber
 */
export const getMyServices = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args): Promise<Service[]> => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return [];
    }

    const member = await getBarbershopMemberByUserId(
      ctx,
      args.barbershopId,
      user.userId,
    );

    if (!member || !member.roles.includes("barber")) {
      return [];
    }

    // Get services assigned to this barber
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

    return services.filter((s): s is Service => s !== null);
  },
});
