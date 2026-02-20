/** biome-ignore-all lint/style/noNonNullAssertion: false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { assertBarber } from "./authz";
import { errorMessages } from "./errors";
import { rateLimitOrThrow } from "./ratelimit";
import type { UserProfileData } from "./tables";
import { tables } from "./tables";
import { getProfileByEmail, getProfileByUserId } from "./userProfileData";

const MINUTE_MS = 60 * 1000;

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

export const create = mutation({
  args: {
    appointment: v.object({
      barbershopId: v.id("barbershops"),
      serviceId: v.id("services"),
      barbershopMemberId: v.id("barbershopMembers"),
      date: v.number(),
      contactPhone: v.string(),
      customerName: v.string(),
      contactEmail: v.optional(v.string()),
      notes: v.optional(v.string()),
      isBarber: v.boolean(),
    }),
  },
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
      uuid: crypto.randomUUID(),
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
    });

    const thirtyMinutesBeforeAppointment = appointment.date - 30 * 60 * 1000;
    const thirtyMinutesAfterAppointment = appointment.date + 30 * 60 * 1000;

    await ctx.scheduler.runAt(
      thirtyMinutesBeforeAppointment,
      internal.appointments.notifyUpcoming,
      {
        appointmentId,
        barbershopId: appointment.barbershopId,
        userId: appointmentUserId,
      },
    );

    await ctx.scheduler.runAt(
      thirtyMinutesAfterAppointment,
      internal.notifications.createPastAppointmentReminder,
      {
        barberUserId: barberProfile.userId,
      },
    );
  },
});

export const getRescheduledRequests = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
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

export const getByUserId = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId || user.userId !== args.userId) {
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

export const getByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      return [];
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .collect();

    // If userId is provided, check if user is a barber (not owner)
    if (args.userId) {
      const userProfile = await ctx.db
        .query("userProfileData")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId!))
        .unique();

      if (userProfile) {
        const barbershopMember = await ctx.db
          .query("barbershopMembers")
          .withIndex("by_userProfileDataId", (q) =>
            q.eq("userProfileDataId", userProfile._id),
          )
          .first();

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

export const getById = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("appointments")
      .withIndex("by_id", (q) => q.eq("_id", args.appointmentId))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
  },
});

export const getByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }
    return await ctx.db
      .query("appointments")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
  },
});

export const setStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: tables.appointments.status,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "setAppointmentStatus", user._id);

    const appt = await ctx.db.get(args.appointmentId);

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

    let updatedAppointment = null;

    switch (args.status) {
      case "completed":
        updatedAppointment = await ctx.db.patch(args.appointmentId, {
          status: "completed",
        });

        await ctx.runMutation(
          internal.barbershopMetadata.incrementCompletedAppointments,
          {
            barbershopMetadataId: barbershop.metadataId,
          },
        );
        break;

      case "no-show":
        updatedAppointment = await ctx.db.patch(args.appointmentId, {
          status: "no-show",
        });

        break;

      case "cancelled":
        await ctx.db.delete(args.appointmentId);
        break;

      default:
        throw new ConvexError(errorMessages.unauthorized);
    }

    return updatedAppointment;
  },
});

export const deleteAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "deleteAppointment", user._id);
    const { appointmentId } = args;

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

    await ctx.db.patch(appointmentId, {
      deletedAt: Date.now(),
    });
  },
});

export const removeAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "removeAppointment", user._id);

    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (user.userId === appointment.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await ctx.db.delete(args.appointmentId);
  },
});

export const cancel = mutation({
  args: {
    appointmentId: v.id("appointments"),
    cancelledByUserId: v.string(),
    reason: v.string(),
    cancelledBy: v.union(v.literal("customer"), v.literal("barber")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(ctx, "cancelAppointment", user._id);

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason,
      proposedDate: undefined,
    });

    switch (args.cancelledBy) {
      case "customer":
        await ctx.runMutation(
          internal.notifications.createAppointmentCancelled,
          {
            appointmentId: args.appointmentId,
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
            appointmentId: args.appointmentId,
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

export const requestReschedule = mutation({
  args: {
    appointmentId: v.id("appointments"),
    proposedDate: v.number(),
    requestedByUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(
      ctx,
      "requestReschedule",
      `${user._id}-${args.appointmentId}`,
    );

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    await ctx.db.patch(args.appointmentId, {
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
        appointmentId: args.appointmentId,
        sendTo: isCustomerRequest ? "barber" : "customer",
      },
    );

    return true;
  },
});

export const notifyUpcoming = internalMutation({
  args: {
    appointmentId: v.id("appointments"),
    barbershopId: v.id("barbershops"),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

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

    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (appointment.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barberProfile = await ctx.db.get(
      barbershopMember?.userProfileDataId!,
    );

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    await ctx.runMutation(internal.notifications.createAppointmentReminder, {
      barbershopName: barbershop.name,
      customerUserId: userProfile?.userId ?? "user_does_not_exist",
      to: userProfile?.email ?? appointment.contactEmail,
      receiverPhoneNumber: appointment.contactPhone,
    });
  },
});

export const answerRescheduleRequest = mutation({
  args: {
    appointmentId: v.id("appointments"),
    accepted: v.boolean(),
    answeredBy: v.union(v.literal("customer"), v.literal("barber")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    await rateLimitOrThrow(
      ctx,
      "answerRescheduleRequest",
      `${user._id}-${args.appointmentId}`,
    );

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (args.accepted) {
      if (!appt.proposedDate) {
        throw new ConvexError(errorMessages.notFound("fecha propuesta"));
      }

      const service = await ctx.db.get(appt.serviceId);

      if (!service) {
        throw new ConvexError(errorMessages.notFound("servicio"));
      }

      const overlap = await ctx.runQuery(internal.appointments.overlaps, {
        appointmentId: args.appointmentId,
        date: appt.proposedDate,
        endAt: appt.proposedDate + service.duration * MINUTE_MS,
      });

      if (overlap) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const newStatus = args.accepted ? "rescheduled" : "denied";

    await ctx.db.patch(args.appointmentId, {
      status: newStatus,
      date: args.accepted && appt.proposedDate ? appt.proposedDate : appt.date,
      proposedDate: undefined,
      rescheduleRequestedByUserId: undefined,
    });

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
        appointmentId: args.appointmentId,
        accepted: args.accepted,
        notes: args.accepted ? undefined : body,
        barbershopName: barbershop.name,
        role: receiverRole,
      },
    );
  },
});

export const overlaps = internalQuery({
  args: {
    appointmentId: v.id("appointments"),
    date: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) throw new ConvexError(errorMessages.notFound("cita"));

    const service = await ctx.db.get(appointment.serviceId);

    if (!service) throw new ConvexError(errorMessages.notFound("servicio"));

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
          q.neq(q.field("_id"), args.appointmentId),
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
