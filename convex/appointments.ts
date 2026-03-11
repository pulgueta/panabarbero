/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { convexToZod } from "convex-helpers/server/zod4";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { z } from "zod";

import { zInternalMutation, zInternalQuery, zMutation, zQuery } from ".";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { assertCanCreateStaffAppointment } from "./acl";
import { authComponent } from "./auth";
import {
  assertBarber,
  getBarbershopMemberByUserId,
  memberHasAnyRole,
} from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { UserProfileData } from "./schema";
import {
  appointments,
  barbershopMembers,
  barbershops,
  services,
} from "./schema";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";

const MINUTE_MS = 60 * 1000;

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
    isBarber: z.boolean(),
  }),
});

async function cancelScheduledNotifications(
  ctx: MutationCtx,
  appointment: Doc<"appointments">,
) {
  const ids = [
    appointment.upcomingNotificationId,
    appointment.pastReminderNotificationId,
  ];

  for (const id of ids) {
    if (!id) continue;
    try {
      await ctx.scheduler.cancel(id);
    } catch {
      // Already completed, failed, or cancelled — safe to ignore
    }
  }
}

function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map((n) => Number(n));

  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;

  return hh * 60 + mm;
}

function minutesOfDay(ts: number): number {
  const d = new Date(ts);

  const utcHours = d.getUTCHours();
  const utcMinutes = d.getUTCMinutes();

  let localHours = utcHours - 5;

  if (localHours < 0) {
    localHours += 24;
  }

  return localHours * 60 + utcMinutes;
}

function withinOpenHours(
  openAt: string | undefined,
  closeAt: string | undefined,
  startAt: number,
  endAt: number,
): boolean {
  if (!openAt || !closeAt) return true;

  const openMin = parseTimeToMinutes(openAt);
  const closeMin = parseTimeToMinutes(closeAt);

  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return true;

  const startMin = minutesOfDay(startAt);
  const endMin = minutesOfDay(endAt);

  const overnight = closeMin <= openMin;

  if (!overnight) {
    return startMin >= openMin && endMin <= closeMin;
  }

  const adjust = (m: number) => (m < openMin ? m + 1440 : m);

  const adjStart = adjust(startMin);
  const adjEnd = adjust(endMin);

  return adjStart >= openMin && adjEnd <= closeMin + 1440;
}

function overlapsLunchBreak(
  lunchStart: string | undefined,
  lunchEnd: string | undefined,
  startAt: number,
  endAt: number,
): boolean {
  if (!lunchStart || !lunchEnd) return false;

  const lunchStartMin = parseTimeToMinutes(lunchStart);
  const lunchEndMin = parseTimeToMinutes(lunchEnd);

  if (Number.isNaN(lunchStartMin) || Number.isNaN(lunchEndMin)) return false;

  const startMin = minutesOfDay(startAt);
  const endMin = minutesOfDay(endAt);

  return startMin < lunchEndMin && endMin > lunchStartMin;
}

export const create = zMutation({
  args: createAppointmentArgs,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "createAppointment", user._id);

    const { appointment } = args;
    const isBarberCreatingAppointment = appointment.isBarber;

    if (isBarberCreatingAppointment) {
      await assertBarber(ctx, appointment.barbershopId, user.userId);
      // Only paid plans (pro / premium) allow staff to create appointments
      // on behalf of clients.
      await assertCanCreateStaffAppointment(ctx, appointment.barbershopId);
    }

    const [service, barber] = await Promise.all([
      ctx.db.get(appointment.serviceId),
      ctx.db.get(appointment.barbershopMemberId),
    ]);

    if (!barber) {
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

    if (appointment.contactEmail) {
      customerProfile = await getProfileByEmail(ctx, appointment.contactEmail);
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

    for (const appt of candidates) {
      const apptService = await ctx.db.get(appt.serviceId);
      const apptEnd = appt.date + (apptService?.duration ?? 0) * MINUTE_MS;
      const overlaps = appt.date < endsAt && apptEnd > appointment.date;

      if (overlaps) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop) throw new ConvexError(errorMessages.notFound("barbería"));

    const date = new Date(appointment.date);
    const dayIdx = date.getDay();
    const dayMap = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ] as const;
    const day = dayMap[dayIdx];
    const dayAvailability = barbershop.availability.find(
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

    const appointmentUserId = isBarberCreatingAppointment
      ? (customerProfile?.userId ?? "user_does_not_exist")
      : user.userId;
    const { isBarber: _isBarber, ...withoutIsBarber } = appointment;

    const appointmentId = await ctx.db.insert("appointments", {
      ...withoutIsBarber,
      userId: appointmentUserId,
      status: "confirmed",
    });

    if (!isBarberCreatingAppointment) {
      await ctx.runMutation(internal.notifications.createAppointmentCreated, {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: appointmentUserId,
        to: barberProfile.email,
        sendTo: "barber",
        barbershopName: barbershop.name,
        receiverPhoneNumber: appointment.contactPhone,
        isBarberCreated: isBarberCreatingAppointment,
      });
    }

    await ctx.runMutation(internal.notifications.createAppointmentCreated, {
      appointmentId,
      barberUserId: barberProfile.userId,
      customerUserId: appointmentUserId,
      to: customerProfile?.email || appointment.contactEmail,
      sendTo: "customer",
      barbershopName: barbershop.name,
      receiverPhoneNumber: appointment.contactPhone,
      isBarberCreated: isBarberCreatingAppointment,
    });

    const thirtyMinutesBeforeAppointment = appointment.date - 30 * 60 * 1000;
    const thirtyMinutesAfterAppointment = appointment.date + 30 * 60 * 1000;

    const upcomingNotificationId = await ctx.scheduler.runAt(
      thirtyMinutesBeforeAppointment,
      internal.appointments.notifyUpcoming,
      {
        appointmentId: { id: appointmentId },
        barbershopId: { id: appointment.barbershopId },
        userId: appointmentUserId,
      },
    );

    const pastReminderNotificationId = await ctx.scheduler.runAt(
      thirtyMinutesAfterAppointment,
      internal.notifications.createPastAppointmentReminder,
      {
        barberUserId: barberProfile.userId,
      },
    );

    await ctx.db.patch(appointmentId, {
      upcomingNotificationId,
      pastReminderNotificationId,
    });
  },
});

export const getRescheduledRequests = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
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

export const getByUserId = zQuery({
  args: z.object({
    userId: z.string(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId || args.userId !== user.userId) {
      return [];
    }

    const result = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.filter((appt) => !appt.deletedAt),
    };
  },
});

export const getByBarbershopId = zQuery({
  args: barbershops.tools.id,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", args.id))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    if (user.userId) {
      const userProfile = await getProfileByUserId(ctx, user.userId);

      if (userProfile) {
        const barbershopMember = await getBarbershopMemberByUserId(
          ctx,
          args.id,
          user.userId,
        );

        // If user is a barber (not owner), filter appointments for this barber only
        if (barbershopMember && !barbershopMember.roles.includes("owner")) {
          return appointments.filter(
            (appt) => appt.barbershopMemberId === barbershopMember._id,
          );
        }
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

export const setStatus = zMutation({
  args: setStatusSchema,
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "setAppointmentStatus", user._id);

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

    if (user.userId === appt.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const member = await getBarbershopMemberByUserId(
      ctx,
      appt.barbershopId,
      user.userId!,
    );

    if (
      !member ||
      !member.isActive ||
      !memberHasAnyRole(member, ["owner", "barber"])
    ) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    let updatedAppointment = null;

    switch (args.status) {
      case "completed":
        await cancelScheduledNotifications(ctx, appt);
        updatedAppointment = await ctx.db.patch(appointmentId, {
          status: "completed",
          upcomingNotificationId: undefined,
          pastReminderNotificationId: undefined,
        });

        await ctx.runMutation(
          internal.barbershopMetadata.incrementCompletedAppointments,
          {
            barbershopMetadataId: barbershop.metadataId,
            barbershopId: appt.barbershopId,
            appointmentId: appointmentId,
          },
        );
        break;

      case "no-show":
        await cancelScheduledNotifications(ctx, appt);
        updatedAppointment = await ctx.db.patch(appointmentId, {
          status: "no-show",
          upcomingNotificationId: undefined,
          pastReminderNotificationId: undefined,
        });

        break;

      case "cancelled":
        await cancelScheduledNotifications(ctx, appt);
        await ctx.db.delete(appointmentId);
        break;

      default:
        throw new ConvexError(errorMessages.unauthorized);
    }

    return updatedAppointment;
  },
});

export const deleteAppointment = zMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "deleteAppointment", user._id);
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

    const isAppointmentBarber = barberProfile.userId === user.userId;
    const isAppointmentCustomer = appointment.userId === user.userId;

    if (!isAppointmentBarber && !isAppointmentCustomer) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await cancelScheduledNotifications(ctx, appointment);

    await ctx.db.patch(appointmentId, {
      deletedAt: Date.now(),
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });
  },
});

export const cancel = zMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
    cancelledByUserId: z.string(),
    reason: z.string(),
    cancelledBy: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "cancelAppointment", user._id);

    const appointmentId = args.appointmentId.id;
    const appt = await ctx.db.get(appointmentId);

    if (!appt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    await cancelScheduledNotifications(ctx, appt);

    await ctx.db.patch(appointmentId, {
      status: "cancelled",
      notes: args.reason,
      proposedDate: undefined,
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });

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
  },
});

export const requestReschedule = zMutation({
  args: z.object({
    appointmentId: appointments.tools.id,
    proposedDate: z.number(),
    requestedByUserId: z.string(),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appointmentId = args.appointmentId.id;
    await rateLimitOrThrow(
      ctx,
      "requestReschedule",
      `${user._id}-${appointmentId}`,
    );

    const appt = await ctx.db.get(appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    await ctx.db.patch(appointmentId, {
      status: "pending",
      proposedDate: args.proposedDate,
      rescheduleRequestedByUserId: args.requestedByUserId,
    });

    const requesterProfile = await getProfileByUserId(ctx, user.userId!);

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

    const customerProfile = await getProfileByUserId(ctx, appt.userId);

    if (!customerProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const isCustomerRequest = appt.userId === requesterProfile.userId;

    await ctx.runMutation(
      internal.notifications.createAppointmentRescheduleRequest,
      {
        appointmentId,
        sendTo: isCustomerRequest ? "barber" : "customer",
      },
    );

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
      to: appointment.contactEmail,
      receiverPhoneNumber: appointment.contactPhone,
    });
  },
});

export const answerRescheduleRequest = zMutation({
  args: z.object({
    appointment: appointments.tools.id,
    accepted: z.boolean(),
    answeredBy: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(
      ctx,
      "answerRescheduleRequest",
      `${user._id}-${args.appointment.id}`,
    );

    const appt = await ctx.db.get(args.appointment.id);

    if (!appt) {
      return;
    }

    if (appt.deletedAt) {
      return;
    }

    if (args.accepted) {
      if (!appt.proposedDate) {
        return;
      }

      const service = await ctx.db.get(appt.serviceId);

      if (!service) {
        return;
      }

      const overlap = await ctx.runQuery(internal.appointments.overlaps, {
        appointment: args.appointment,
        date: appt.proposedDate,
        endAt: appt.proposedDate + service.duration * MINUTE_MS,
      });

      if (overlap) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const newStatus = args.accepted ? "rescheduled" : "denied";

    if (args.accepted && appt.proposedDate) {
      await cancelScheduledNotifications(ctx, appt);

      const thirtyMinBefore = appt.proposedDate - 30 * 60 * 1000;
      const thirtyMinAfter = appt.proposedDate + 30 * 60 * 1000;

      const upcomingNotificationId = await ctx.scheduler.runAt(
        thirtyMinBefore,
        internal.appointments.notifyUpcoming,
        {
          appointmentId: { id: args.appointment.id },
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
          { barberUserId: barberProf.userId },
        );
      }

      await ctx.db.patch(args.appointment.id, {
        status: newStatus,
        date: appt.proposedDate,
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
        upcomingNotificationId,
        pastReminderNotificationId,
      });
    } else {
      await ctx.db.patch(args.appointment.id, {
        status: newStatus,
        proposedDate: undefined,
        rescheduleRequestedByUserId: undefined,
      });
    }

    const barber = await ctx.db.get(appt.barbershopMemberId);

    if (!barber) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barberProfile = await ctx.db.get(barber.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const customerProfile = await getProfileByUserId(ctx, appt.userId);

    if (!customerProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const barbershop = await ctx.db.get(appt.barbershopId);

    if (!barbershop) {
      throw new ConvexError(errorMessages.notFound("barbería"));
    }

    const isCustomerAccepting = args.answeredBy === "customer";
    const receiverProfile = isCustomerAccepting
      ? barberProfile
      : customerProfile;
    const receiverRole = isCustomerAccepting ? "barber" : "customer";
    const receiverUserId = receiverProfile.userId;

    const formattedDate = new Intl.DateTimeFormat("es-CO", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(appt.proposedDate!));

    const body = args.accepted
      ? `Tu cita ha sido confirmada con la nueva fecha: ${formattedDate}.`
      : "La solicitud fue rechazada y la cita fue cancelada.";

    await ctx.runMutation(
      internal.notifications.createAppointmentRescheduleDecision,
      {
        receiverUserId,
        to: receiverProfile.email,
        appointmentId: args.appointment.id,
        accepted: args.accepted,
        notes: args.accepted ? undefined : body,
        barbershopName: barbershop.name,
        role: receiverRole,
      },
    );
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

    for (const appt of activeCandidates) {
      const svc = await ctx.db.get(appt.serviceId);
      const apptEnd = appt.date + (svc?.duration ?? 0) * MINUTE_MS;
      const overlaps = appt.date < args.endAt && apptEnd > args.date;
      if (overlaps) return appt;
    }

    return null;
  },
});
