import { errorMessages } from "@panabarbero/constants";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { rateLimiter } from "./ratelimit";
import { tables } from "./tables";

function parseTimeToMinutes(time: string): number {
  const [hh, mm] = time.split(":").map((n) => Number(n));

  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;

  return hh * 60 + mm;
}

function minutesOfDay(ts: number): number {
  const d = new Date(ts);

  return d.getHours() * 60 + d.getMinutes();
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
      userId: v.string(),
      barbershopId: v.id("barbershops"),
      serviceId: v.id("services"),
      barbershopMemberId: v.id("barbershopMembers"),
      date: v.number(),
      contactPhone: v.string(),
      customerName: v.string(),
      contactEmail: v.string(),
      notes: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const { appointment } = args;

    const [service, barber] = await Promise.all([
      ctx.db.get(appointment.serviceId),
      ctx.db.get(appointment.barbershopMemberId),
    ]);

    if (!barber) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    if (!service) {
      throw new ConvexError(errorMessages.notFound("servicio"));
    }

    const endsAt = appointment.date + service.duration;

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
          ),
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

    const endAt = appointment.date + (service.duration ?? 0);

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

    const appointmentId = await ctx.db.insert("appointments", {
      ...appointment,
      uuid: crypto.randomUUID(),
      status: "confirmed",
    });

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appointment.userId,
      },
    );

    if (!userProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barber.userId,
      },
    );

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const enabledChannels = {
      user: userProfile.notificationsPreferences.filter((n) => n.enabled),
      barber: barberProfile.notificationsPreferences.filter((n) => n.enabled),
    };

    const userChannels = enabledChannels.user.map((n) => n.type);

    if (userChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            uuid: crypto.randomUUID(),
            channels: userChannels,
            reason: "appointment_confirmed",
            body: "Tu cita ha sido confirmada con éxito",
            title: "Cita confirmada",
            senderUserId: "system",
            receiverUserId: userProfile.userId,
            appointmentId,
          },
        },
      );
    }

    const barberChannels = enabledChannels.barber.map((n) => n.type);

    if (barberChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            uuid: crypto.randomUUID(),
            channels: barberChannels,
            reason: "appointment_created",
            body: "Un nuevo cliente ha reservado una cita",
            title: "Nueva cita",
            senderUserId: "system",
            receiverUserId: barber.userId,
            appointmentId,
          },
        },
      );
    }

    const thirtyMinutesBeforeAppointment = appointment.date - 30 * 60 * 1000;

    await ctx.scheduler.runAt(
      thirtyMinutesBeforeAppointment,
      internal.appointments.notifyUpcomingAppointment,
      {
        appointmentId,
        barbershopId: appointment.barbershopId,
        userId: appointment.userId,
      },
    );

    return appointmentId;
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
        ),
      )
      .collect();

    return appointments;
  },
});

export const getAppointmentsByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (user?.userId !== args.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId ?? ""))
      .order("desc")
      .collect();

    return appointments;
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

      .collect();

    return appointments;
  },
});

export const getAppointmentById = query({
  args: {
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appointmentId);
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
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    return appointment;
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
    const appointment = await ctx.db
      .query("appointments")
      .withIndex("by_userIdAndBarbershopId", (q) =>
        q.eq("userId", args.userId).eq("barbershopId", args.barbershopId),
      )
      .unique();

    return appointment;
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

    const updatedAppointment = await ctx.db.patch(args.appointmentId, {
      status: args.status,
    });
    const appt = await ctx.db.get(args.appointmentId);

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

      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason,
        title,
        body: title,
        senderUserId: barbershopMember?.userId ?? "system",
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

    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason: "appointment_rescheduled",
        title: "Cita reagendada",
        body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.date).toLocaleDateString()}`,
        senderUserId: barbershopMember?.userId ?? "system",
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

    await ctx.db.delete(appointmentId);

    // TODO: Notify the barber that the appointment was deleted using the notes
  },
});

export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    cancelledByUserId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }
    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason,
    });

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

    if (!userProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const enabledChannels =
      userProfile?.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type) ?? [];

    if (enabledChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            uuid: crypto.randomUUID(),
            channels: enabledChannels,
            reason: "appointment_cancelled",
            title: "Cita cancelada",
            body:
              args.reason ??
              "Tu cita ha sido cancelada. Comunícate con tu barbero para más detalles.",
            senderUserId: args.cancelledByUserId,
            receiverUserId: appt.userId,
            appointmentId: args.appointmentId,
          },
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
    note: v.optional(v.string()),
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
            dateStyle: "full",
            timeStyle: "short",
          }).format(new Date(Date.now() + retryAfter)),
        ),
      );
    }

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    await ctx.db.patch(args.appointmentId, {
      status: "pending",
      notes: args.note,
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

    const customerProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

    if (!customerProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const customerChannels = customerProfile.notificationsPreferences
      .filter((n) => n.enabled)
      .map((n) => n.type);

    const formattedDate = new Intl.DateTimeFormat("es-CO", {
      dateStyle: "full",
      timeStyle: "short",
    }).format(new Date(args.proposedDate));
    const noteSuffix = args.note ? ` Nota: ${args.note}` : "";

    if (customerChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body: `Tu barbero propuso reagendar la cita para el ${formattedDate}.${noteSuffix}`,
            reason: "appointment_rescheduled_request",
            receiverUserId: customerProfile.userId,
            title: "Solicitud de reagendamiento",
            uuid: crypto.randomUUID(),
            senderUserId: requesterProfile.userId,
            channels: customerChannels,
            appointmentId: args.appointmentId,
          },
        },
      );
    }

    const barbershopMember = await ctx.db.get(appt.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barbershopMemberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barbershopMember.userId,
      },
    );

    if (!barbershopMemberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const barbershopMemberChannels =
      barbershopMemberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type);

    if (
      appt.userId === requesterProfile.userId &&
      barbershopMemberChannels.length > 0
    ) {
      const requesterName =
        requesterProfile.name ?? appt.customerName ?? "Un cliente";

      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body: `${requesterName} solicitó reagendar la cita para el ${formattedDate}.${noteSuffix}`,
            reason: "appointment_rescheduled_request",
            receiverUserId: barbershopMember.userId,
            title: "Solicitud de reagendamiento",
            uuid: crypto.randomUUID(),
            senderUserId: requesterProfile.userId,
            channels: barbershopMemberChannels,
            appointmentId: args.appointmentId,
          },
        },
      );
    }

    return true;
  },
});

const notificationTexts = {
  reminder: {
    user_appointment_reminder: (barbershopName?: string) =>
      `Tienes una cita en ~30 minutos en ${barbershopName}`,
    barber_appointment_reminder: "Tienes una cita en ~30 minutos agendada",
  },
  subject: "Recordatorio de cita",
};

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

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barbershopMember.userId,
      },
    );

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const channels = {
      user: userProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type),
      barber: barberProfile.notificationsPreferences
        .filter((n) => n.enabled)
        .map((n) => n.type),
    };

    if (channels.user.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body: notificationTexts.reminder.user_appointment_reminder(
              barbershop?.name,
            ),
            reason: "appointment_reminder",
            senderUserId: "system",
            title: notificationTexts.subject,
            uuid: crypto.randomUUID(),
            channels: channels.user,
            receiverUserId: args.userId,
            appointmentId: args.appointmentId,
          },
        },
      );
    }

    if (channels.barber.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body: notificationTexts.reminder.barber_appointment_reminder,
            reason: "appointment_reminder",
            senderUserId: "system",
            title: notificationTexts.subject,
            uuid: crypto.randomUUID(),
            channels: channels.barber,
            receiverUserId: barbershopMember.userId,
            appointmentId: args.appointmentId,
          },
        },
      );
    }
  },
});

export const answerRescheduleRequest = mutation({
  args: {
    appointmentId: v.id("appointments"),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new ConvexError(errorMessages.notFound("cita"));

    const newStatus = args.accepted ? "rescheduled" : "denied";

    await ctx.db.patch(args.appointmentId, {
      status: newStatus,
      date: args.accepted && appt.proposedDate ? appt.proposedDate : appt.date,
      proposedDate: undefined,
      rescheduleRequestedByUserId: undefined,
      notes: args.accepted
        ? undefined
        : "Petición rechazada, la cita ha sido cancelada.",
    });

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

    if (!userProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const title = args.accepted
      ? "Reagendamiento aceptado"
      : "Reagendamiento rechazado";
    const body = args.accepted
      ? "Tu cita ha sido confirmada con la nueva fecha."
      : "La solicitud fue rechazada y la cita fue cancelada.";
    const reason = args.accepted
      ? "appointment_rescheduled_accepted"
      : "appointment_rescheduled_denied";

    const userChannels = userProfile.notificationsPreferences.map(
      (n) => n.type,
    );

    if (userChannels.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.createNotification,
        {
          notification: {
            body,
            reason,
            receiverUserId: userProfile.userId,
            title,
            uuid: crypto.randomUUID(),
            senderUserId: "system",
            channels: userChannels,
            appointmentId: args.appointmentId,
          },
        },
      );
    }
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

    for (const appt of candidates) {
      const svc = await ctx.db.get(appt.serviceId);
      const apptEnd = appt.date + (svc?.duration ?? 0);
      const overlaps = appt.date < args.endAt && apptEnd > args.date;
      if (overlaps) return appt;
    }

    return null;
  },
});
