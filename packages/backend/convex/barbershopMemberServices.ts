/** Barbershop Member Services - Per-barber service assignment */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zQuery } from ".";
import type { QueryCtx } from "./_generated/server";
import { assertCanManageTeam } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { Service } from "./schema";
import { barbershopMembers, barbershops, services } from "./schema";

export const getBarbershopBarbers = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const members = await ctx.db
      .query("barbershopMembers")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.neq(q.field("isActive"), false))
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

/** Active barbers explicitly assigned to EVERY service in the set. */
async function barbersOfferingAllServices(
  ctx: QueryCtx,
  serviceIds: Service["_id"][],
) {
  if (serviceIds.length === 0) {
    return [];
  }

  const assignmentSets = await Promise.all(
    serviceIds.map(async (serviceId) => {
      const assignments = await ctx.db
        .query("barbershopMemberServices")
        .withIndex("by_serviceId", (q) => q.eq("serviceId", serviceId))
        .filter((q) => q.neq(q.field("isActive"), false))
        .collect();

      return new Set(assignments.map((a) => a.barbershopMemberId));
    }),
  );

  const [firstSet, ...restSets] = assignmentSets;
  const memberIds = [...firstSet].filter((memberId) =>
    restSets.every((set) => set.has(memberId)),
  );

  if (memberIds.length === 0) {
    return [];
  }

  const barbers = await Promise.all(
    memberIds.map(async (memberId) => {
      const member = await ctx.db.get(memberId);

      if (!member?.isActive) return null;

      const profile = await ctx.db.get(member.userProfileDataId);

      return {
        ...member,
        name: profile?.name ?? "",
        email: profile?.email ?? "",
        phoneNumber: profile?.phoneNumber ?? "",
        avatarUrl: profile?.image ?? "",
      };
    }),
  );

  return barbers.filter(
    (b): b is NonNullable<typeof b> => !!b && b.roles.includes("barber"),
  );
}

/**
 * Get all barbers who offer a specific service.
 * Only returns barbers who are explicitly assigned to this service.
 * No fallback to "all barbers" - assignments are mandatory.
 */
export const getBarbersForService = zQuery({
  args: services.tools.id,
  handler: async (ctx, args) => {
    return await barbersOfferingAllServices(ctx, [args.id]);
  },
});

/** Barbers assigned to ALL of the selected services (multi-service booking). */
export const getBarbersForServices = zQuery({
  args: z.object({
    serviceIds: services.tools.id.shape.id.array(),
  }),
  handler: async (ctx, args) => {
    return await barbersOfferingAllServices(ctx, args.serviceIds);
  },
});

/**
 * Set the services that a barber can perform
 * Owners and staff can assign services to barbers
 */
export const setBarberServices = zAuthMutation({
  args: z.object({
    barbershopMember: barbershopMembers.tools.id,
    services: z.array(services.tools.id),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "setBarberServices", userId);

    const member = await ctx.db.get(args.barbershopMember.id);

    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    await assertCanManageTeam(ctx, member.barbershopId, userId);

    if (!member.roles.includes("barber")) {
      throw new ConvexError("El miembro seleccionado no es un barbero");
    }

    const fetchedServices = await Promise.all(
      args.services.map(({ id }) => ctx.db.get(id)),
    );

    for (let i = 0; i < args.services.length; i++) {
      const service = fetchedServices[i];
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

    await Promise.all([
      ...servicesToAdd.map((service) =>
        ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: member.barbershopId,
          barbershopMemberId: args.barbershopMember.id,
          serviceId: service.id,
          isActive: true,
        }),
      ),
      ...servicesToRemove.map((assignment) =>
        ctx.db.patch(assignment._id, { isActive: false }),
      ),
      ...servicesToReactivate.map((assignment) =>
        ctx.db.patch(assignment._id, { isActive: true }),
      ),
    ]);
  },
});

export const assignAllServicesToBarber = zInternalMutation({
  args: barbershopMembers.tools.id,
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.id);
    if (!member) {
      throw new ConvexError(errorMessages.notFound("miembro de barbería"));
    }

    const [services, existingAssignments] = await Promise.all([
      ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", member.barbershopId),
        )
        .collect(),
      ctx.db
        .query("barbershopMemberServices")
        .withIndex("by_barbershopMemberId", (q) =>
          q.eq("barbershopMemberId", args.id),
        )
        .collect(),
    ]);

    const existingServiceIds = new Set(
      existingAssignments.map((a) => a.serviceId),
    );

    await Promise.all([
      ...services.flatMap((service) =>
        existingServiceIds.has(service._id)
          ? []
          : [
              ctx.db.insert("barbershopMemberServices", {
                uuid: crypto.randomUUID(),
                barbershopId: member.barbershopId,
                barbershopMemberId: args.id,
                serviceId: service._id,
                isActive: true,
              }),
            ],
      ),
      ...existingAssignments.flatMap((assignment) =>
        assignment.isActive === false
          ? [ctx.db.patch(assignment._id, { isActive: true })]
          : [],
      ),
    ]);
  },
});
