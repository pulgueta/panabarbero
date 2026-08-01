/** biome-ignore-all lint/style/noNonNullAssertion: is always provided */

import { ConvexError } from "convex/values";
import { z } from "zod";

import { zAuthMutation, zQuery } from ".";
import { internal } from "./_generated/api";
import { track } from "./analytics";
import { assertCanManageServices, assertCanManageTeam } from "./authz";
import { cascadingDelete } from "./cascade";
import { errorMessages } from "./errors";
import {
  releaseForAppointment,
  releaseServiceLineForAppointment,
} from "./inventory";
import { rateLimitOrThrow } from "./ratelimit";
import type { Appointment } from "./schema";
import { appointments, barbershops, services } from "./schema";

export const create = zAuthMutation({
  args: services.tools.insert,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      rateLimitOrThrow(ctx, "createService", userId),
      assertCanManageServices(ctx, args.barbershopId, userId),
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

    await track(ctx, {
      distinctId: userId,
      event: "service_created",
      properties: {
        serviceId,
        serviceName: args.name,
        servicePrice: args.price,
        durationMinutes: args.duration,
        barbershopId: args.barbershopId,
      },
      groups: { barbershop: args.barbershopId },
    });

    // Refresh the shop's Pana knowledge base (no-op unless on the premium plan).
    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.barbershopId,
    });

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

export const update = zAuthMutation({
  args: services.tools.update,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "updateService", userId);

    if (!args.data.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    // Only owners and staff can edit services (not barbers — business decision)
    await assertCanManageTeam(ctx, args.data.barbershopId, userId);

    await ctx.db.patch(args.id, args.data);

    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.data.barbershopId,
    });
  },
});

/**
 * Delete a service with 2-step confirmation if future appointments reference it.
 *
 * - If `force` is false/undefined and impacted appointments exist: throws
 *   ConvexError "WILL_CANCEL:N:WILL_UPDATE:M" — N citas whose ONLY service is
 *   this one (they will be cancelled), M multi-service citas (they lose this
 *   line but survive).
 * - If `force` is true: cancels the sole-line citas (today's flow) and drops
 *   the line from multi-service ones — the block shrinks from the tail
 *   (duration derives from items), `serviceId` re-points if the primary line
 *   fell, that line's inventory hold is released, and customers get a "tu
 *   cita se actualizó" notification.
 *
 * The sweep scans the shop's FUTURE active appointments via
 * `by_barbershopId_and_date` (a multi-line cita may not carry this service in
 * its denormalized `serviceId`, so `by_serviceId` can't see it). Bounded per
 * shop; if a mega-shop ever trips the 32k scanned-documents limit the mutation
 * aborts atomically — port the paged self-rescheduling pattern from
 * `barbershopCascade.ts` before raising any cap.
 */
export const deleteService = zAuthMutation({
  args: z.object({
    barbershop: barbershops.tools.id,
    service: services.tools.id,
    force: z.boolean().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await Promise.all([
      rateLimitOrThrow(ctx, "deleteService", userId),
      assertCanManageTeam(ctx, args.barbershop.id, userId),
    ]);

    const service = await ctx.db.get(args.service.id);
    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    if (service.barbershopId !== args.barbershop.id) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const now = Date.now();

    // Future active citas referencing this service on ANY line. Legacy rows
    // (no items) reference it iff their single `serviceId` matches.
    const futureAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId_and_date", (q) =>
        q.eq("barbershopId", args.barbershop.id).gte("date", now),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("deletedAt"), undefined),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
        ),
      )
      .collect();

    const cancelAppointments: Appointment[] = [];
    const updateAppointments: Appointment[] = [];

    for (const appt of futureAppointments) {
      if (appt.items && appt.items.length > 0) {
        if (!appt.items.some((line) => line.serviceId === args.service.id)) {
          continue;
        }

        if (appt.items.length === 1) {
          cancelAppointments.push(appt);
        } else {
          updateAppointments.push(appt);
        }
      } else if (appt.serviceId === args.service.id) {
        cancelAppointments.push(appt);
      }
    }

    // 2-step confirmation: if not force and anything is impacted, report both counts
    if (
      !args.force &&
      (cancelAppointments.length > 0 || updateAppointments.length > 0)
    ) {
      throw new ConvexError(
        `WILL_CANCEL:${cancelAppointments.length}:WILL_UPDATE:${updateAppointments.length}`,
      );
    }

    // If force or no impacted appointments, proceed with deletion
    const barbershop = await ctx.db.get(args.barbershop.id);

    for (const appt of cancelAppointments) {
      await releaseForAppointment(
        ctx,
        appt,
        `Servicio "${service.name}" eliminado por la barbería`,
      );
      await ctx.db.patch(appt._id, {
        status: "cancelled",
        deletedAt: Date.now(),
        notes: `Servicio "${service.name}" eliminado por la barbería`,
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
    }

    // Multi-service citas survive: drop the line (duration/total derive from
    // items, so the block shrinks from the tail), re-point the denormalized
    // primary if it fell, and free that line's inventory hold.
    for (const appt of updateAppointments) {
      const remaining = (appt.items ?? []).filter(
        (line) => line.serviceId !== args.service.id,
      );

      await releaseServiceLineForAppointment(ctx, appt, args.service.id);

      await ctx.db.patch(appt._id, {
        items: remaining,
        serviceId: remaining[0].serviceId,
      });
    }

    await Promise.all([
      ...cancelAppointments.map((appt) =>
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
      ...updateAppointments.map((appt) =>
        ctx.runMutation(internal.notifications.createServiceLineRemoved, {
          appointmentId: appt._id,
          customerUserId: appt.userId,
          serviceName: service.name,
          barbershopName: barbershop?.name ?? "la barbería",
          contactPhone: appt.contactPhone,
          contactEmail: appt.contactEmail,
        }),
      ),
    ]);

    // A deleted service takes its barber assignments and inventory recipe
    // with it (`services` cascade rules in cascade.ts).
    await cascadingDelete.deleteWithCascade(ctx, "services", args.service.id);

    await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
      barbershopId: args.barbershop.id,
    });
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
