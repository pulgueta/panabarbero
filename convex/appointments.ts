/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import {
  zAuthMutation,
  zAuthQuery,
  zInternalMutation,
  zInternalQuery,
  zQuery,
} from ".";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertCanCreateStaffAppointment } from "./acl";
import { track } from "./analytics";
import {
  assertCanMutateAppointment,
  assertShopRole,
  getBarbershopMemberByUserId,
  memberHasAnyRole,
} from "./authz";
import { getEffectiveSchedule } from "./barbershopMembers";
import { errorMessages } from "./errors";
import { getUserId } from "./identity";
import {
  consumeForAppointment,
  releaseForAppointment,
  reserveForAppointment,
} from "./inventory";
import { rateLimitOrThrow } from "./ratelimit";
import type { Appointment, UserProfileData } from "./schema";
import {
  appointments,
  barbershopMembers,
  barbershops,
  services,
} from "./schema";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";
import {
  DAY_MAP,
  formatPhoneNumber,
  minutesOfDay,
  overlapsLunchBreak,
  parseTimeToMinutes,
  toColombiaDateKey,
  withinOpenHours,
} from "./utils";

const MINUTE_MS = 60 * 1000;

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const createAppointmentArgs = z.object({
  appointment: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    serviceId: services.tools.id.shape.id,
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    date: z.number(),
    contactPhone: z.string(),
    customerName: z.string(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
    isStaffCreated: z.boolean(),
  }),
});

async function cancelScheduledNotifications(
  ctx: MutationCtx,
  appointment: Appointment,
) {
  const ids = [
    appointment.upcomingNotificationId,
    appointment.pastReminderNotificationId,
  ].filter(Boolean);

  await Promise.all(
    ids.map(async (id) => {
      try {
        await ctx.scheduler.cancel(id!);
      } catch {
        // Already completed, failed, or cancelled — safe to ignore
      }
    }),
  );
}

export const create = zAuthMutation({
  args: createAppointmentArgs,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "createAppointment", userId);

    const { appointment } = args;
    const contactEmail = appointment.contactEmail?.trim() || undefined;
    const isStaffCreatingAppointment = appointment.isStaffCreated;

    if (isStaffCreatingAppointment) {
      await assertShopRole(ctx, appointment.barbershopId, userId, [
        "barber",
        "staff",
      ]);
      // Only paid plans (pro / premium) allow staff to create appointments
      // on behalf of clients.
      await assertCanCreateStaffAppointment(ctx, appointment.barbershopId);
    }

    const [service, barber] = await Promise.all([
      ctx.db.get(appointment.serviceId),
      ctx.db.get(appointment.barbershopMemberId),
    ]);

    if (!barber || !barber.isActive) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    if (barber.barbershopId !== appointment.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (!barber.userProfileDataId) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    if (service.barbershopId !== appointment.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const barberProfile = await ctx.db.get(barber.userProfileDataId);
    let customerProfile: UserProfileData | null = null;

    if (contactEmail) {
      customerProfile = await getProfileByEmail(ctx, contactEmail);
    }

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const endsAt = appointment.date + service.duration * MINUTE_MS;

    const startOfDay = new Date(appointment.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const candidates = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", appointment.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("barbershopMemberId"), appointment.barbershopMemberId),
          q.and(
            q.gte(q.field("date"), startOfDay.getTime()),
            q.lte(q.field("date"), endOfDay.getTime()),
          ),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const apptServices = await Promise.all(
      candidates.map((appt) => ctx.db.get(appt.serviceId)),
    );

    for (let i = 0; i < candidates.length; i++) {
      const appt = candidates[i];
      const apptService = apptServices[i];
      const apptEnd = appt.date + (apptService?.duration ?? 0) * MINUTE_MS;
      const overlaps = appt.date < endsAt && apptEnd > appointment.date;

      if (overlaps) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop) throw new ConvexError(errorMessages.notFound("barbería"));

    // A deactivated shop (owner-disabled, or tombstoned while a batched
    // cascade delete drains its rows) must not accept new bookings.
    if (!barbershop.isActive) {
      throw new ConvexError(errorMessages.barbershopInactive);
    }

    const effectiveSchedule = await getEffectiveSchedule(
      ctx,
      appointment.barbershopMemberId,
    );
    const day = DAY_MAP[new Date(appointment.date).getDay()];
    const dayAvailability = effectiveSchedule.find(
      (a) => a.weekDay.day === day,
    );

    if (!dayAvailability || !dayAvailability.weekDay.isActive) {
      throw new ConvexError(errorMessages.barbershopClosedOnSelectedDay);
    }

    const endAt = appointment.date + service.duration * MINUTE_MS;

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.date,
        endAt,
      )
    ) {
      throw new ConvexError(errorMessages.appointmentOutsideWorkingHours);
    }

    if (
      overlapsLunchBreak(
        dayAvailability.lunchStart,
        dayAvailability.lunchEnd,
        appointment.date,
        endAt,
      )
    ) {
      throw new ConvexError(errorMessages.appointmentUnavailableHours);
    }

    const appointmentUserId = isStaffCreatingAppointment
      ? (customerProfile?.userId ?? "user_does_not_exist")
      : userId;
    const { isStaffCreated: _isStaffCreated, ...withoutIsStaffCreated } =
      appointment;
    const contactPhone = formatPhoneNumber(withoutIsStaffCreated.contactPhone);

    // Resolve creator member ID for staff-created appointments
    let createdByMemberId: typeof appointment.barbershopMemberId | undefined;
    if (isStaffCreatingAppointment) {
      const creatorMember = await getBarbershopMemberByUserId(
        ctx,
        appointment.barbershopId,
        userId,
      );
      createdByMemberId = creatorMember?._id;
    }

    const appointmentId = await ctx.db.insert("appointments", {
      ...withoutIsStaffCreated,
      contactEmail,
      contactPhone,
      userId: appointmentUserId,
      status: "confirmed",
      createdBy: createdByMemberId,
    });

    // Reserve the service's inventory recipe (never throws, plan-gated no-op).
    await reserveForAppointment(ctx, {
      _id: appointmentId,
      barbershopId: appointment.barbershopId,
      serviceId: appointment.serviceId,
      userId: appointmentUserId,
    });

    if (!isStaffCreatingAppointment) {
      await ctx.runMutation(internal.notifications.createAppointmentCreated, {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: appointmentUserId,
        sendTo: "barber",
        barbershopName: barbershop.name,
        receiverPhoneNumber: contactPhone,
      });
    }

    await ctx.runMutation(internal.notifications.createAppointmentCreated, {
      appointmentId,
      barberUserId: barberProfile.userId,
      customerUserId: appointmentUserId,
      sendTo: "customer",
      barbershopName: barbershop.name,
      receiverPhoneNumber: contactPhone,
    });

    const thirtyMinutesBeforeAppointment = appointment.date - 30 * 60 * 1000;
    const thirtyMinutesAfterAppointment = appointment.date + 30 * 60 * 1000;

    const [upcomingNotificationId, pastReminderNotificationId] =
      await Promise.all([
        ctx.scheduler.runAt(
          thirtyMinutesBeforeAppointment,
          internal.appointments.notifyUpcoming,
          {
            appointmentId: { id: appointmentId },
            barbershopId: { id: appointment.barbershopId },
            userId: appointmentUserId,
          },
        ),
        ctx.scheduler.runAt(
          thirtyMinutesAfterAppointment,
          internal.notifications.createPastAppointmentReminder,
          {
            barbershopId: appointment.barbershopId,
            barberUserId: barberProfile.userId,
          },
        ),
      ]);

    await ctx.db.patch(appointmentId, {
      upcomingNotificationId,
      pastReminderNotificationId,
    });

    await track(ctx, {
      distinctId: userId,
      event: "appointment_created",
      properties: {
        appointmentId,
        barbershopId: appointment.barbershopId,
        source: "web",
        isStaffCreated: isStaffCreatingAppointment,
        serviceId: appointment.serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        durationMinutes: service.duration,
        barberId: appointment.barbershopMemberId,
        customerType: contactEmail ? "registered" : "anonymous",
      },
      groups: { barbershop: appointment.barbershopId },
    });
  },
});

export const getRescheduledRequests = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return [];
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.not(q.eq(q.field("rescheduleRequestedByUserId"), null)),
          q.and(
            q.not(q.eq(q.field("status"), "confirmed")),
            q.not(q.eq(q.field("status"), "no-show")),
          ),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    return appointments;
  },
});

export const getByUserId = zAuthQuery({
  args: z.object({
    userId: z.string(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    if (!userId || args.userId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const result = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return result;
  },
});

export const getByBarbershopId = zQuery({
  args: z.object({
    ...barbershops.tools.id.shape,
    date: z.number().optional(),
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    if (!userId) {
      return [];
    }

    const startOfDay = args.date ?? Date.now();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId_and_date", (q) =>
        q
          .eq("barbershopId", args.id)
          .gte("date", startOfDay)
          .lte("date", endOfDay),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    const userProfile = await getProfileByUserId(ctx, userId);

    if (userProfile) {
      const barbershopMember = await getBarbershopMemberByUserId(
        ctx,
        args.id,
        userId,
      );

      // If user is a barber (not owner/staff), filter appointments for this barber only
      if (
        barbershopMember &&
        !barbershopMember.roles.includes("owner") &&
        !barbershopMember.roles.includes("staff")
      ) {
        return appointments.filter(
          (appt) => appt.barbershopMemberId === barbershopMember._id,
        );
      }
    }

    return appointments;
  },
});

export const getById = zQuery({
  args: appointments.tools.id,
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const setStatusSchema = z.object({
  appointment: appointments.tools.id,
  status: z.enum(["completed", "no-show", "cancelled"]),
});

export const setStatus = zAuthMutation({
  args: setStatusSchema,
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "setAppointmentStatus", userId);

    const appointmentId = args.appointment.id;

    const appt = await ctx.db.get(appointmentId);

    if (!appt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershop = await ctx.db.get(appt.barbershopId);

    if (!barbershop?.metadataId) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (userId === appt.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await getBarbershopMemberByUserId(
      ctx,
      appt.barbershopId,
      userId,
    );

    if (
      !member ||
      !member.isActive ||
      !memberHasAnyRole(member, ["owner", "barber", "staff"])
    ) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    let updatedAppointment = null;

    switch (args.status) {
      case "completed": {
        await cancelScheduledNotifications(ctx, appt);

        updatedAppointment = await ctx.db.patch(appointmentId, {
          status: "completed",
          upcomingNotificationId: undefined,
          pastReminderNotificationId: undefined,
        });

        // Release the recipe holds and consume the stock the service used.
        await consumeForAppointment(ctx, appt);

        await ctx.runMutation(
          internal.barbershopMetadata.incrementCompletedAppointments,
          {
            barbershopId: appt.barbershopId,
            appointmentId: appointmentId,
          },
        );

        await track(ctx, {
          distinctId: userId,
          event: "appointment_completed",
          properties: {
            appointmentId,
            barbershopId: appt.barbershopId,
            serviceId: appt.serviceId,
            barberId: appt.barbershopMemberId,
          },
          groups: { barbershop: appt.barbershopId },
        });

        break;
      }

      case "no-show":
        await cancelScheduledNotifications(ctx, appt);
        updatedAppointment = await ctx.db.patch(appointmentId, {
          status: "no-show",
          upcomingNotificationId: undefined,
          pastReminderNotificationId: undefined,
        });

        await releaseForAppointment(ctx, appt);

        await track(ctx, {
          distinctId: userId,
          event: "appointment_no_show",
          properties: {
            appointmentId,
            barbershopId: appt.barbershopId,
            serviceId: appt.serviceId,
            barberId: appt.barbershopMemberId,
          },
          groups: { barbershop: appt.barbershopId },
        });
        break;

      case "cancelled":
        await cancelScheduledNotifications(ctx, appt);

        // Must run BEFORE the hard delete below — the ledger lookup needs the
        // relatedAppointmentId while the doc is still referenced.
        await releaseForAppointment(ctx, appt);

        if (appt.status === "completed") {
          await ctx.runMutation(
            internal.barbershopMetadata.decrementCompletedAppointments,
            {
              barbershopId: appt.barbershopId,
              appointmentId,
              appointmentDate: appt.date,
            },
          );
        }

        await ctx.db.delete(appointmentId);
        break;

      default:
        throw new ConvexError(errorMessages.unauthorized);
    }

    return updatedAppointment;
  },
});

export const deleteAppointment = zAuthMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "deleteAppointment", userId);
    const appointmentId = args.appointmentId.id;

    const appointment = await ctx.db.get(appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const isAppointmentBarber = barberProfile.userId === userId;
    const isAppointmentCustomer = appointment.userId === userId;

    // Also check if user is a staff member or owner of the barbershop
    let isShopStaffOrOwner = false;
    if (!isAppointmentBarber && !isAppointmentCustomer) {
      const callerMember = await getBarbershopMemberByUserId(
        ctx,
        appointment.barbershopId,
        userId,
      );
      isShopStaffOrOwner =
        !!callerMember &&
        callerMember.isActive &&
        memberHasAnyRole(callerMember, ["owner", "staff"]);
    }

    if (!isAppointmentBarber && !isAppointmentCustomer && !isShopStaffOrOwner) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await cancelScheduledNotifications(ctx, appointment);

    await ctx.db.patch(appointmentId, {
      deletedAt: Date.now(),
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });

    await releaseForAppointment(ctx, appointment);
  },
});

export const cancel = zAuthMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
    cancelledByUserId: z.string(),
    reason: z.string(),
    cancelledBy: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(ctx, "cancelAppointment", userId);

    const appointmentId = args.appointmentId.id;
    const appt = await ctx.db.get(appointmentId);

    if (!appt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (args.cancelledByUserId !== userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await assertCanMutateAppointment(ctx, appt, userId);

    const isCustomerCancellation = appt.userId === userId;

    if (
      (isCustomerCancellation && args.cancelledBy !== "customer") ||
      (!isCustomerCancellation && args.cancelledBy !== "barber")
    ) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await cancelScheduledNotifications(ctx, appt);

    await ctx.db.patch(appointmentId, {
      status: "cancelled",
      notes: args.reason,
      proposedDate: undefined,
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });

    await releaseForAppointment(ctx, appt);

    switch (args.cancelledBy) {
      case "customer":
        await ctx.runMutation(
          internal.notifications.createAppointmentCancelled,
          {
            appointmentId,
            notes: args.reason,
            customerUserId: appt.userId,
            sendTo: "barber",
          },
        );
        break;
      case "barber":
        await ctx.runMutation(
          internal.notifications.createAppointmentCancelled,
          {
            appointmentId,
            notes: args.reason,
            customerUserId: appt.userId,
            sendTo: "customer",
          },
        );
        break;
      default:
        throw new ConvexError(errorMessages.unauthorized);
    }

    await track(ctx, {
      distinctId: userId,
      event: "appointment_cancelled",
      properties: {
        appointmentId,
        barbershopId: appt.barbershopId,
        cancelledBy: args.cancelledBy,
        serviceId: appt.serviceId,
        barberId: appt.barbershopMemberId,
        reason: args.reason,
      },
      groups: { barbershop: appt.barbershopId },
    });
  },
});

export const requestReschedule = zAuthMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
    proposedDate: z.number(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    const appointmentId = args.appointmentId.id;
    await rateLimitOrThrow(
      ctx,
      "requestReschedule",
      `${userId}-${appointmentId}`,
    );

    const appt = await ctx.db.get(appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    // A completed visit already happened — rescheduling it back to "pending"
    // would strand its single-use review code (the issued review link would
    // silently stop working and is never re-minted on a later re-completion).
    if (appt.status === "completed") {
      throw new ConvexError(errorMessages.cannotRescheduleCompleted);
    }

    await ctx.db.patch(appointmentId, {
      status: "pending",
      proposedDate: args.proposedDate,
      rescheduleRequestedByUserId: userId,
    });

    const requesterProfile = await getProfileByUserId(ctx, userId);

    if (!requesterProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const barbershopMember = await ctx.db.get(appt.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barberProfile = await ctx.db.get(
      barbershopMember?.userProfileDataId!,
    );

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const barbershop = await ctx.db.get(appt.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    let customerProfile = null;

    if (appt.userId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, appt.userId);
    }

    const isCustomerRequest =
      customerProfile?.userId === requesterProfile.userId;

    await ctx.runMutation(
      internal.notifications.createAppointmentRescheduleRequest,
      {
        appointmentId,
        sendTo: isCustomerRequest ? "barber" : "customer",
      },
    );

    await track(ctx, {
      distinctId: userId,
      event: "appointment_reschedule_requested",
      properties: {
        appointmentId,
        barbershopId: appt.barbershopId,
        requestedBy: isCustomerRequest ? "customer" : "barber",
        proposedDate: args.proposedDate,
        serviceId: appt.serviceId,
        barberId: appt.barbershopMemberId,
      },
      groups: { barbershop: appt.barbershopId },
    });

    return true;
  },
});

export const notifyUpcoming = zInternalMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
    barbershopId: barbershops.tools.id,
    userId: z.string(),
  }),
  handler: async (ctx, args) => {
    const barbershopId = args.barbershopId.id;
    const barbershop = await ctx.db.get(barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    let userProfile: UserProfileData | null = null;

    if (args.userId !== "user_does_not_exist") {
      userProfile = await getProfileByUserId(ctx, args.userId);

      if (!userProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const appointmentId = args.appointmentId.id;
    const appointment = await ctx.db.get(appointmentId);

    if (!appointment || appointment.deletedAt) {
      return;
    }

    const activeStatuses = ["confirmed", "rescheduled", "pending"];
    if (!activeStatuses.includes(appointment.status)) {
      return;
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      return;
    }

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      return;
    }

    await ctx.runMutation(internal.notifications.createAppointmentReminder, {
      barbershopName: barbershop.name,
      barbershopId: barbershopId,
      customerUserId: userProfile?.userId ?? "user_does_not_exist",
      receiverPhoneNumber: appointment.contactPhone,
    });
  },
});

async function applyRescheduleDecision(
  ctx: MutationCtx,
  args: {
    accepted: boolean;
    actorUserId: string;
    answeredBy: "customer" | "barber";
    appointmentId: Id<"appointments">;
    requireAuthenticatedActor: boolean;
  },
) {
  const appt = await ctx.db.get(args.appointmentId);

  if (!appt) {
    return false;
  }

  if (appt.deletedAt) {
    return false;
  }

  if (args.requireAuthenticatedActor) {
    if (args.answeredBy === "customer") {
      if (appt.userId !== args.actorUserId) {
        throw new ConvexError(errorMessages.unauthorized);
      }
    } else {
      await assertShopRole(ctx, appt.barbershopId, args.actorUserId, [
        "owner",
        "barber",
        "staff",
      ]);
    }
  }

  if (!appt.proposedDate) {
    return false;
  }

  if (args.accepted) {
    const service = await ctx.db.get(appt.serviceId);

    if (!service) {
      return false;
    }

    const overlap = await ctx.runQuery(internal.appointments.overlaps, {
      appointment: { id: args.appointmentId },
      date: appt.proposedDate,
      endAt: appt.proposedDate + service.duration * MINUTE_MS,
    });

    if (overlap) {
      throw new ConvexError(errorMessages.appointmentOverlaps);
    }
  }

  const newStatus = args.accepted ? "rescheduled" : "denied";

  if (args.accepted) {
    await cancelScheduledNotifications(ctx, appt);

    const thirtyMinBefore = appt.proposedDate - 30 * 60 * 1000;
    const thirtyMinAfter = appt.proposedDate + 30 * 60 * 1000;

    const upcomingNotificationId = await ctx.scheduler.runAt(
      thirtyMinBefore,
      internal.appointments.notifyUpcoming,
      {
        appointmentId: { id: args.appointmentId },
        barbershopId: { id: appt.barbershopId },
        userId: appt.userId,
      },
    );

    const barberMember = await ctx.db.get(appt.barbershopMemberId);
    const barberProf = barberMember
      ? await ctx.db.get(barberMember.userProfileDataId)
      : null;

    let pastReminderNotificationId: typeof appt.pastReminderNotificationId;

    if (barberProf) {
      pastReminderNotificationId = await ctx.scheduler.runAt(
        thirtyMinAfter,
        internal.notifications.createPastAppointmentReminder,
        {
          barbershopId: appt.barbershopId,
          barberUserId: barberProf.userId,
        },
      );
    }

    await ctx.db.patch(args.appointmentId, {
      status: newStatus,
      date: appt.proposedDate,
      proposedDate: undefined,
      rescheduleRequestedByUserId: undefined,
      upcomingNotificationId,
      pastReminderNotificationId,
    });
  } else {
    await ctx.db.patch(args.appointmentId, {
      status: newStatus,
      proposedDate: undefined,
      rescheduleRequestedByUserId: undefined,
    });

    // "denied" is a terminal state — free the recipe holds and stop the
    // reminders scheduled for the original date.
    if (newStatus === "denied") {
      await releaseForAppointment(ctx, appt);
      await cancelScheduledNotifications(ctx, appt);
    }
  }

  const barber = await ctx.db.get(appt.barbershopMemberId);

  if (!barber) {
    throw new ConvexError(errorMessages.notFound("barbero"));
  }

  const barberProfile = await ctx.db.get(barber.userProfileDataId);

  if (!barberProfile) {
    throw new ConvexError(errorMessages.notFound("perfil de barbero"));
  }

  let customerProfile = null;

  if (appt.userId !== "user_does_not_exist") {
    customerProfile = await getProfileByUserId(ctx, appt.userId);
  }

  const barbershop = await ctx.db.get(appt.barbershopId);

  if (!barbershop) {
    throw new ConvexError(errorMessages.notFound("barbería"));
  }

  const isCustomerAccepting = args.answeredBy === "customer";
  const receiverProfile = isCustomerAccepting ? barberProfile : customerProfile;
  const receiverRole = isCustomerAccepting ? "barber" : "customer";
  const receiverUserId = receiverProfile?.userId ?? "user_does_not_exist";

  const formattedDate = dateTimeFormatter.format(new Date(appt.proposedDate));

  const body = args.accepted
    ? `Tu cita ha sido confirmada con la nueva fecha: ${formattedDate}.`
    : "La solicitud fue rechazada y la cita fue cancelada.";

  await ctx.runMutation(
    internal.notifications.createAppointmentRescheduleDecision,
    {
      receiverUserId,
      appointmentId: args.appointmentId,
      accepted: args.accepted,
      notes: args.accepted ? undefined : body,
      barbershopName: barbershop.name,
      role: receiverRole,
    },
  );

  await track(ctx, {
    distinctId: args.actorUserId,
    event: "appointment_reschedule_decided",
    properties: {
      appointmentId: args.appointmentId,
      barbershopId: appt.barbershopId,
      accepted: args.accepted,
      barberId: appt.barbershopMemberId,
      serviceId: appt.serviceId,
    },
    groups: { barbershop: appt.barbershopId },
  });

  return true;
}

function phoneMatches(left: string | undefined, right: string | undefined) {
  if (!left || !right) {
    return false;
  }

  const normalizedLeft = formatPhoneNumber(left);
  const normalizedRight = formatPhoneNumber(right);

  return !!normalizedLeft && normalizedLeft === normalizedRight;
}

export const answerRescheduleRequestFromWhatsApp = zInternalMutation({
  args: z.object({
    appointmentId: appointments.tools.id.shape.id,
    accepted: z.boolean(),
    answeredBy: z.enum(["customer", "barber"]),
    proposedAt: z.number(),
    senderPhone: z.string(),
  }),
  handler: async (ctx, args) => {
    const appt = await ctx.db.get(args.appointmentId);

    if (!appt || appt.deletedAt) {
      return false;
    }

    // Bind the reply to the proposal it was sent for: a replayed button from
    // an older reschedule message must not decide a newer proposal.
    if (appt.proposedDate !== args.proposedAt) {
      return false;
    }

    if (args.answeredBy === "customer") {
      let customerProfile = null;

      if (appt.userId !== "user_does_not_exist") {
        customerProfile = await getProfileByUserId(ctx, appt.userId);
      }

      const senderMatches =
        phoneMatches(args.senderPhone, appt.contactPhone) ||
        phoneMatches(args.senderPhone, customerProfile?.phoneNumber);

      if (!senderMatches) {
        return false;
      }

      return await applyRescheduleDecision(ctx, {
        accepted: args.accepted,
        actorUserId: appt.userId,
        answeredBy: args.answeredBy,
        appointmentId: args.appointmentId,
        requireAuthenticatedActor: false,
      });
    }

    const barber = await ctx.db.get(appt.barbershopMemberId);

    if (!barber) {
      return false;
    }

    const barberProfile = await ctx.db.get(barber.userProfileDataId);

    if (
      !barberProfile?.phoneNumber ||
      !phoneMatches(args.senderPhone, barberProfile.phoneNumber)
    ) {
      return false;
    }

    return await applyRescheduleDecision(ctx, {
      accepted: args.accepted,
      actorUserId: barberProfile.userId,
      answeredBy: args.answeredBy,
      appointmentId: args.appointmentId,
      requireAuthenticatedActor: false,
    });
  },
});

export const answerRescheduleRequest = zAuthMutation({
  args: z.object({
    appointment: appointments.tools.id,
    accepted: z.boolean(),
    answeredBy: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    await rateLimitOrThrow(
      ctx,
      "answerRescheduleRequest",
      `${userId}-${args.appointment.id}`,
    );

    await applyRescheduleDecision(ctx, {
      accepted: args.accepted,
      actorUserId: userId,
      answeredBy: args.answeredBy,
      appointmentId: args.appointment.id,
      requireAuthenticatedActor: true,
    });
  },
});

export const overlaps = zInternalQuery({
  args: z.object({
    appointment: appointments.tools.id,
    date: z.number(),
    endAt: z.number(),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointment.id);

    if (!appointment) {
      return;
    }

    const service = await ctx.db.get(appointment.serviceId);

    if (!service) {
      return;
    }

    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const candidates = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", appointment.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("barbershopMemberId"), appointment.barbershopMemberId),
          q.and(
            q.gte(q.field("date"), startOfDay.getTime()),
            q.lte(q.field("date"), endOfDay.getTime()),
          ),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
          q.neq(q.field("_id"), args.appointment.id),
        ),
      )
      .collect();

    const activeCandidates = candidates.filter((appt) => !appt.deletedAt);

    const services = await Promise.all(
      activeCandidates.map((appt) => ctx.db.get(appt.serviceId)),
    );

    for (let i = 0; i < activeCandidates.length; i++) {
      const appt = activeCandidates[i];
      const svc = services[i];
      const apptEnd = appt.date + (svc?.duration ?? 0) * MINUTE_MS;
      const overlaps = appt.date < args.endAt && apptEnd > args.date;
      if (overlaps) return appt;
    }

    return null;
  },
});

// ---------------------------------------------------------------------------
// Available time slots for booking
// ---------------------------------------------------------------------------

const SLOT_INTERVAL = 30; // minutes

/**
 * Returns available 30-minute time slots for a given barber + date + service.
 *
 * Logic:
 * 1. Get effective schedule for the barber (custom or inherited from barbershop).
 * 2. Generate 30-min slots from openAt to (closeAt - serviceDuration).
 * 3. Exclude slots that overlap the lunch break.
 * 4. Exclude slots that overlap an existing appointment (pending/confirmed/rescheduled).
 * 5. Exclude past slots if the date is today.
 *
 * The query is reactive — if another user books a slot, it auto-updates in real-time.
 */
export const getAvailableSlots = zQuery({
  args: z.object({
    barbershopId: barbershops.tools.id.shape.id,
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    serviceId: services.tools.id.shape.id,
    /** Midnight timestamp of the selected date (any time on that day works). */
    date: z.number(),
  }),
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);

    if (!service) {
      return [];
    }

    const effectiveSchedule = await getEffectiveSchedule(
      ctx,
      args.barbershopMemberId,
    );

    // Determine which day of the week we're looking at
    const dateObj = new Date(args.date);
    const dayKey = DAY_MAP[dateObj.getDay()];
    const dayAvailability = effectiveSchedule.find(
      (a) => a.weekDay.day === dayKey,
    );

    if (!dayAvailability || !dayAvailability.weekDay.isActive) {
      return [];
    }

    const openMin = parseTimeToMinutes(dayAvailability.openAt);
    const closeMin = parseTimeToMinutes(dayAvailability.closeAt);

    if (Number.isNaN(openMin) || Number.isNaN(closeMin)) {
      return [];
    }

    const lunchStartMin = dayAvailability.lunchStart
      ? parseTimeToMinutes(dayAvailability.lunchStart)
      : null;
    const lunchEndMin = dayAvailability.lunchEnd
      ? parseTimeToMinutes(dayAvailability.lunchEnd)
      : null;
    const hasLunch =
      lunchStartMin !== null &&
      lunchEndMin !== null &&
      !Number.isNaN(lunchStartMin) &&
      !Number.isNaN(lunchEndMin);

    const serviceDuration = service.duration; // in minutes

    // Generate candidate slots
    const slots: Array<{ time: string; minutes: number }> = [];

    for (
      let min = openMin;
      min + serviceDuration <= closeMin;
      min += SLOT_INTERVAL
    ) {
      const slotEnd = min + serviceDuration;

      // Skip if slot overlaps the lunch break
      if (hasLunch && min < lunchEndMin! && slotEnd > lunchStartMin!) {
        continue;
      }

      const hh = String(Math.floor(min / 60)).padStart(2, "0");
      const mm = String(min % 60).padStart(2, "0");

      slots.push({ time: `${hh}:${mm}`, minutes: min });
    }

    if (slots.length === 0) {
      return [];
    }

    // Fetch existing appointments for this barber on this day
    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("barbershopMemberId"), args.barbershopMemberId),
          q.gte(q.field("date"), startOfDay.getTime()),
          q.lte(q.field("date"), endOfDay.getTime()),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    // Build occupied ranges [startMin, endMin) — batch-load services to avoid N+1
    const uniqueServiceIds = [
      ...new Set(existingAppointments.map((a) => a.serviceId)),
    ];
    const loadedServices = await Promise.all(
      uniqueServiceIds.map((id) => ctx.db.get(id)),
    );
    const serviceMap = new Map(
      loadedServices.flatMap((s) =>
        s ? [[s._id.toString(), s] as const] : [],
      ),
    );

    const occupied: Array<{ start: number; end: number }> = [];

    for (const appt of existingAppointments) {
      const apptService = serviceMap.get(appt.serviceId.toString());
      const apptDuration = apptService?.duration ?? 0;
      const apptStartMin = minutesOfDay(appt.date);
      const apptEndMin = apptStartMin + apptDuration;
      occupied.push({ start: apptStartMin, end: apptEndMin });
    }

    // Filter out slots that conflict with existing appointments
    const nowMinutes = minutesOfDay(Date.now());
    // Use Colombia-aware date comparison to avoid off-by-one around midnight (UTC vs UTC-5)
    const isToday =
      toColombiaDateKey(args.date) === toColombiaDateKey(Date.now());

    return slots.filter((slot) => {
      // Skip past slots for today
      if (isToday && slot.minutes < nowMinutes) {
        return false;
      }

      const slotEnd = slot.minutes + serviceDuration;

      // Check overlap with occupied ranges
      return !occupied.some(
        (occ) => slot.minutes < occ.end && slotEnd > occ.start,
      );
    });
  },
});

const ANON_PREFIX = "anon:";

export const agentBook = zInternalMutation({
  args: z.object({
    userId: z.string(),
    barbershopId: barbershops.tools.id.shape.id,
    serviceId: services.tools.id.shape.id,
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    date: z.number(),
    customerName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const [service, barber, barbershop] = await Promise.all([
      ctx.db.get(args.serviceId),
      ctx.db.get(args.barbershopMemberId),
      ctx.db.get(args.barbershopId),
    ]);

    if (!barber) throw new ConvexError(errorMessages.notFound("barbero"));
    if (!service) throw new ConvexError(errorMessages.notFound("servicio"));
    if (!barbershop) throw new ConvexError(errorMessages.notFound("barbería"));
    if (barber.barbershopId !== args.barbershopId)
      throw new ConvexError(errorMessages.unauthorized);
    if (!barber.userProfileDataId)
      throw new ConvexError(errorMessages.notFound("barbero"));

    const barberProfile = await ctx.db.get(barber.userProfileDataId);
    if (!barberProfile)
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));

    const endsAt = args.date + service.duration * MINUTE_MS;

    const startOfDay = new Date(args.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const candidates = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("barbershopMemberId"), args.barbershopMemberId),
          q.gte(q.field("date"), startOfDay.getTime()),
          q.lte(q.field("date"), endOfDay.getTime()),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
            q.eq(q.field("status"), "rescheduled"),
          ),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    const candidateServices = await Promise.all(
      candidates.map((appt) => ctx.db.get(appt.serviceId)),
    );

    for (let i = 0; i < candidates.length; i++) {
      const appt = candidates[i];
      const apptService = candidateServices[i];
      const apptEnd = appt.date + (apptService?.duration ?? 0) * MINUTE_MS;
      if (appt.date < endsAt && apptEnd > args.date) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const contactPhone = formatPhoneNumber(args.contactPhone);

    const appointmentId = await ctx.db.insert("appointments", {
      userId: args.userId,
      barbershopId: args.barbershopId,
      serviceId: args.serviceId,
      barbershopMemberId: args.barbershopMemberId,
      date: args.date,
      customerName: args.customerName,
      contactPhone,
      contactEmail: args.contactEmail,
      notes: args.notes,
      status: "confirmed",
    });

    // Second booking entry point (Pana agent) — reserve here too.
    await reserveForAppointment(ctx, {
      _id: appointmentId,
      barbershopId: args.barbershopId,
      serviceId: args.serviceId,
      userId: args.userId,
    });

    const isAnon = args.userId.startsWith(ANON_PREFIX);

    await ctx.runMutation(internal.notifications.createAppointmentCreated, {
      appointmentId,
      barberUserId: barberProfile.userId,
      customerUserId: "user_does_not_exist",
      sendTo: "barber",
      barbershopName: barbershop.name,
      receiverPhoneNumber: contactPhone,
    });

    // Anonymous agent bookings never notify the customer: the phone is
    // caller-supplied and unverified, so sending would be an unauthenticated
    // arbitrary-recipient WhatsApp send (and burn the shop's quota).
    if (!isAnon) {
      await ctx.runMutation(internal.notifications.createAppointmentCreated, {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: args.userId,
        sendTo: "customer",
        barbershopName: barbershop.name,
        receiverPhoneNumber: contactPhone,
      });
    }

    await track(ctx, {
      distinctId: args.userId,
      event: "appointment_created",
      properties: {
        appointmentId,
        barbershopId: args.barbershopId,
        source: "agent",
        serviceId: args.serviceId,
        serviceName: service.name,
        servicePrice: service.price,
        durationMinutes: service.duration,
        barberId: args.barbershopMemberId,
      },
      groups: { barbershop: args.barbershopId },
    });

    return appointmentId;
  },
});
