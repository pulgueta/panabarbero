/** biome-ignore-all lint/style/noNonNullAssertion: is always provided */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zMutation, zQuery } from ".";
import { internal } from "./_generated/api";
import { authComponent } from "./auth";
import { assertCanManageServices, assertCanManageTeam } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import { appointments, barbershops, services } from "./schema";

export const create = zMutation({
  args: services.tools.insert,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      rateLimitOrThrow(ctx, "createService", user._id),
      assertCanManageServices(ctx, args.barbershopId, user.userId),
    ]);

    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop?.isActive) {
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershopId),
        )
        .first();

      if (!existingService) {
        await ctx.db.patch(args.barbershopId, {
          isActive: true,
        });
      }
    }

    const [serviceId, members] = await Promise.all([
      ctx.db.insert("services", args),
      ctx.db
        .query("barbershopMembers")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.barbershopId),
        )
        .filter((q) => q.eq(q.field("isActive"), true))
        .collect(),
    ]);

    if (members.length === 1) {
      const onlyMember = members[0];
      const isOwnerAndBarber =
        onlyMember.roles.includes("owner") &&
        onlyMember.roles.includes("barber");

      if (isOwnerAndBarber) {
        await ctx.db.insert("barbershopMemberServices", {
          uuid: crypto.randomUUID(),
          barbershopId: args.barbershopId,
          barbershopMemberId: onlyMember._id,
          serviceId,
          isActive: true,
        });
      }
    }

    return serviceId;
  },
});

export const getById = zQuery({
  args: services.tools.id,
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getByIds = zQuery({
  args: z.object({
    serviceIds: services.tools.id.array(),
  }),
  handler: async (ctx, args) => {
    return await Promise.all(
      args.serviceIds.map(async (serviceId) => await ctx.db.get(serviceId.id)),
    );
  },
});

export const update = zMutation({
  args: services.tools.update,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "updateService", user._id);

    if (!args.data.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Only owners and staff can edit services (not barbers — business decision)
    await assertCanManageTeam(ctx, args.data.barbershopId, user.userId);

    await ctx.db.patch(args.id, args.data);
  },
});

/**
 * Delete a service with 2-step confirmation if future appointments exist.
 *
 * - If `force` is false/undefined and impacted appointments exist:
 *   throws ConvexError with message "WILL_CANCEL:N" where N is count of impacted appointments.
 * - If `force` is true: cancels/soft-deletes all impacted appointments, notifies customers, then deletes service.
 */
export const deleteService = zMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    service: services.tools.id,
    force: z.boolean().optional(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await Promise.all([
      rateLimitOrThrow(ctx, "deleteService", user._id),
      assertCanManageTeam(ctx, args.barbershop.id, user.userId),
    ]);

    const service = await ctx.db.get(args.service.id);
    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    if (service.barbershopId !== args.barbershop.id) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const now = Date.now();

    // Find impacted appointments: future/upcoming, not deleted, not cancelled/completed/no-show
    const impactedAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_serviceId", (q) => q.eq("serviceId", args.service.id))
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
    if (!args.force && impactedAppointments.length > 0) {
      throw new ConvexError(`WILL_CANCEL:${impactedAppointments.length}`);
    }

    // If force or no impacted appointments, proceed with deletion
    // Cancel and soft-delete impacted appointments, notify customers
    const [barbershop] = await Promise.all([
      ctx.db.get(args.barbershop.id),
      ...impactedAppointments.map((appt) =>
        ctx.db.patch(appt._id, {
          status: "cancelled",
          deletedAt: Date.now(),
          notes: `Servicio "${service.name}" eliminado por la barbería`,
          proposedDate: undefined,
          rescheduleRequestedByUserId: undefined,
        }),
      ),
    ]);

    // Delete all barber-service assignments for this service
    const [, assignments] = await Promise.all([
      Promise.all(
        impactedAppointments.map((appt) =>
          ctx.runMutation(
            internal.notifications.createServiceDeletedCancellation,
            {
              appointmentId: appt._id,
              customerUserId: appt.userId,
              serviceName: service.name,
              barbershopName: barbershop?.name ?? "la barbería",
              contactPhone: appt.contactPhone,
              contactEmail: appt.contactEmail,
            },
          ),
        ),
      ),
      ctx.db
        .query("barbershopMemberServices")
        .withIndex("by_serviceId", (q) => q.eq("serviceId", args.service.id))
        .collect(),
    ]);

    await Promise.all([
      ...assignments.map((assignment) => ctx.db.delete(assignment._id)),
      ctx.db.delete(args.service.id),
    ]);
  },
});

export const getByAppointmentId = zQuery({
  args: appointments.tools.id,
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.id);

    if (!appointment) {
      return null;
    }

    return await ctx.db.get(appointment.serviceId);
  },
});
