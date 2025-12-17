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
import { errorMessages } from "./errors";
import { rateLimiter } from "./ratelimit";
import type { UserProfileData } from "./tables";
import { tables } from "./tables";

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

export const createAppointment = mutation({
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

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const { appointment } = args;

    const [service, barber] = await Promise.all([
      ctx.db.get(appointment.serviceId),
      ctx.db.get(appointment.barbershopMemberId),
    ]);

    if (!barber?.userProfileDataId) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    const barberProfile = await ctx.db.get(barber.userProfileDataId);
    let customerProfile: UserProfileData | null = null;

    if (appointment.contactEmail) {
      customerProfile = await ctx.runQuery(
        internal.userProfileData.getProfileByEmail,
        {
          email: appointment.contactEmail,
        },
      );
    }

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const endsAt = appointment.date + service.duration;

    const startOfDay = new Date(appointment.date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(startOfDay);
    endOfDay.setHours(23, 59, 59, 999);

    const isBarberCreatingAppointment = appointment.isBarber;

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
          ),
          q.eq(q.field("deletedAt"), undefined),
        ),
      )
      .collect();

    for (const appt of candidates) {
      const apptService = await ctx.db.get(appt.serviceId);
      const apptEnd = appt.date + (apptService?.duration ?? 0);
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

    const endAt = appointment.date + service.duration;

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
      throw new ConvexError(errorMessages.appointmentDuringLunchBreak);
    }

    const appointmentUserId = isBarberCreatingAppointment
      ? (customerProfile?.userId ?? "user_does_not_exist")
      : barberProfile.userId;
    const { isBarber: _isBarber, ...withoutIsBarber } = appointment;

    const appointmentId = await ctx.db.insert("appointments", {
      ...withoutIsBarber,
      userId: appointmentUserId,
      uuid: crypto.randomUUID(),
      status: "confirmed",
    });

    if (!isBarberCreatingAppointment) {
      await ctx.runMutation(
        internal.notifications.createAppointmentCreatedNotification,
        {
          appointmentId,
          barberUserId: barberProfile.userId,
          customerUserId: customerProfile?.userId ?? "user_does_not_exist",
          to: barberProfile.email,
          sendTo: "barber",
          barbershopName: barbershop.name,
        },
      );
    }

    await ctx.runMutation(
      internal.notifications.createAppointmentCreatedNotification,
      {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: customerProfile?.userId ?? "user_does_not_exist",
        // @ts-expect-error - email is optional
        to: customerProfile?.email ?? appointment.contactEmail,
        sendTo: "customer",
        barbershopName: barbershop.name,
      },
    );

    const thirtyMinutesBeforeAppointment = appointment.date - 30 * 60 * 1000;
    const thirtyMinutesAfterAppointment = appointment.date + 30 * 60 * 1000;

    await ctx.scheduler.runAt(
      thirtyMinutesBeforeAppointment,
      internal.appointments.notifyUpcomingAppointment,
      {
        appointmentId,
        barbershopId: appointment.barbershopId,
        userId: appointmentUserId,
      },
    );

    await ctx.scheduler.runAt(
      thirtyMinutesAfterAppointment,
      internal.notifications.createPastAppointmentReminderNotification,
      {
        barberUserId: barberProfile.userId,
      },
    );
  },
});

export const getRescheduledAppointmentRequests = query({
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

export const getAppointmentsByUserId = query({
  args: {
    userId: v.string(),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (user?.userId !== args.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const result = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId ?? ""))
      .order("desc")
      .paginate(args.paginationOpts);

    return {
      ...result,
      page: result.page.filter((appt) => !appt.deletedAt),
    };
  },
});

export const getAppointmentsByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
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

    return appointments;
  },
});

export const getAppointmentById = query({
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

export const getAppointmentByUuid = query({
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

export const getAppointmentByUserIdAndBarbershopId = query({
  args: {
    userId: v.string(),
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }
    return await ctx.db
      .query("appointments")
      .withIndex("by_userIdAndBarbershopId", (q) =>
        q.eq("userId", args.userId).eq("barbershopId", args.barbershopId),
      )
      .filter((q) => q.eq(q.field("deletedAt"), undefined))
      .unique();
  },
});

export const setAppointmentStatus = mutation({
  args: {
    appointmentId: v.id("appointments"),
    status: tables.appointments.status,
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const updatedAppointment = await ctx.db.patch(args.appointmentId, {
      status: args.status,
    });

    if (appt) {
      const titleMap: Record<string, string> = {
        confirmed: "Cita confirmada",
        cancelled: "Cita cancelada",
        completed: "Cita completada",
        "no-show": "Cita marcada como no asistió",
        rescheduled: "Cita reagendada",
        pending: "Cita pendiente",
      };

      const reasonMap: Record<
        string,
        (typeof tables.notifications)["reason"]["type"]
      > = {
        confirmed: "appointment_confirmed",
        cancelled: "appointment_cancelled",
        completed: "appointment_confirmed",
        "no-show": "appointment_no_show",
        rescheduled: "appointment_rescheduled",
        pending: "appointment_confirmed",
      } as const;
      const reason = reasonMap[args.status as keyof typeof reasonMap];
      const title =
        titleMap[args.status as keyof typeof titleMap] ??
        "Actualización de cita";
      const barbershopMember = await ctx.db.get(appt.barbershopMemberId);
      const userProfile = await ctx.db.get(
        barbershopMember?.userProfileDataId!,
      );

      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason,
        title,
        body: title,
        senderUserId: userProfile?.userId ?? "system",
        receiverUserId: appt.userId,
        appointmentId: args.appointmentId,
      });
    }

    return updatedAppointment;
  },
});

export const updateAppointment = mutation({
  args: {
    appointment: v.object({
      ...tables.appointments,
    }),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated");
    }
    const { appointment, appointmentId } = args;

    const original = await ctx.db.get(appointmentId);

    if (!original) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    if (original.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const service = await ctx.db.get(appointment.serviceId);

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    const duration =
      service.duration && original.date && original.proposedDate
        ? original.date + service.duration
        : 0;

    const overlap = await ctx.runQuery(
      internal.appointments.appointmentOverlaps,
      {
        appointmentId,
        date: appointment.date,
        endAt: duration,
      },
    );

    if (overlap) {
      throw new ConvexError(errorMessages.appointmentOverlaps);
    }

    const shop = await ctx.db.get(appointment.barbershopId);

    if (!shop) throw new ConvexError(errorMessages.notFound("barbería"));

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
    const dayAvailability = shop.availability.find(
      (a) => a.weekDay.day === day,
    );

    if (!dayAvailability || !dayAvailability.weekDay.isActive) {
      throw new Error("Barbershop is closed on selected day");
    }

    const endAt =
      appointment.proposedDate ?? appointment.date + (service.duration ?? 0);

    if (
      !withinOpenHours(
        new Date(dayAvailability.openAt).toISOString(),
        new Date(dayAvailability.closeAt).toISOString(),
        appointment.date,
        endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    if (
      overlapsLunchBreak(
        dayAvailability.lunchStart,
        dayAvailability.lunchEnd,
        appointment.date,
        endAt,
      )
    ) {
      throw new ConvexError(errorMessages.appointmentDuringLunchBreak);
    }

    const updatedAppointment = await ctx.db.patch(appointmentId, appointment);
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.date !== appointment.date ||
          original.proposedDate !== appointment.proposedDate));

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);
    const userProfile = await ctx.db.get(barbershopMember?.userProfileDataId!);

    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason: "appointment_rescheduled",
        title: "Cita reagendada",
        body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.date).toLocaleDateString()}`,
        senderUserId: userProfile?.userId ?? "system",
        receiverUserId: appointment.userId,
        appointmentId,
      });
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
    const { appointmentId } = args;

    const appointment = await ctx.db.get(appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
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
    await ctx.db.delete(args.appointmentId);
  },
});

export const cancelAppointment = mutation({
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

    if (args.cancelledBy === "customer") {
      await ctx.runMutation(
        internal.notifications.createAppointmentCancelledNotification,
        {
          appointmentId: args.appointmentId,
          notes: args.reason,
          customerUserId: appt.userId,
          sendTo: "barber",
        },
      );
    } else {
      await ctx.runMutation(
        internal.notifications.createAppointmentCancelledNotification,
        {
          appointmentId: args.appointmentId,
          notes: args.reason,
          customerUserId: appt.userId,
          sendTo: "customer",
        },
      );
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

    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "requestReschedule",
      {
        key: `${user._id}-${args.appointmentId}`,
      },
    );

    if (!ok) {
      throw new ConvexError(
        errorMessages.rateLimitExceeded(
          new Intl.DateTimeFormat("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Bogota",
          }).format(new Date(Date.now() + retryAfter)),
        ),
      );
    }

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

    const requesterProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: user.userId ?? "",
      },
    );

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

    const customerProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

    if (!customerProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const isCustomerRequest = appt.userId === requesterProfile.userId;

    await ctx.runMutation(
      internal.notifications.createAppointmentRescheduleRequestNotification,
      {
        appointmentId: args.appointmentId,
        sendTo: isCustomerRequest ? "barber" : "customer",
      },
    );

    return true;
  },
});

export const notifyUpcomingAppointment = internalMutation({
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

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.userId,
      },
    );

    if (!userProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
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

    await ctx.runMutation(
      internal.notifications.createAppointmentReminderNotification,
      {
        barbershopName: barbershop.name,
        customerUserId: userProfile.userId,
        to: userProfile.email,
      },
    );
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

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    if (appt.deletedAt) {
      throw new ConvexError(errorMessages.notFound("cita"));
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

    const customerProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

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
      internal.notifications.createAppointmentRescheduleDecisionNotification,
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

export const getBarbershopAvailability = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop) throw new ConvexError(errorMessages.notFound("barbería"));

    return barbershop.availability;
  },
});

export const appointmentOverlaps = internalQuery({
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
          ),
          q.neq(q.field("_id"), args.appointmentId),
        ),
      )
      .collect();

    const activeCandidates = candidates.filter((appt) => !appt.deletedAt);

    for (const appt of activeCandidates) {
      const svc = await ctx.db.get(appt.serviceId);
      const apptEnd = appt.date + (svc?.duration ?? 0);
      const overlaps = appt.date < args.endAt && apptEnd > args.date;
      if (overlaps) return appt;
    }

    return null;
  },
});

export const getAppointmentsByBarbershopIdAndDate = query({
  args: {
    barbershopId: v.id("barbershops"),
    date: v.number(),
    pagination: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const fromDate = new Date(args.date);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(fromDate);
    toDate.setHours(23, 59, 59, 999);

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.gte(q.field("date"), fromDate.getTime()),
          q.lte(q.field("date"), toDate.getTime()),
        ),
      )
      .collect();

    return appointments.filter((appt) => !appt.deletedAt);
  },
});
