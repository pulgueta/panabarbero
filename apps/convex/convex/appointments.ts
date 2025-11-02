import { v } from "convex/values";
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
  if (!openAt || !closeAt) return false;

  const openMin = parseTimeToMinutes(openAt);
  const closeMin = parseTimeToMinutes(closeAt);

  if (Number.isNaN(openMin) || Number.isNaN(closeMin)) return false;

  const startMin = minutesOfDay(startAt);
  const endMin = endAt ? minutesOfDay(endAt) : undefined;

  return startMin >= openMin && (endMin ? endMin <= closeMin : true);
}

export const createAppointment = mutation({
  args: {
    appointment: v.object({
      userId: v.string(),
      barbershopId: v.id("barbershops"),
      serviceId: v.id("services"),
      barberId: v.id("barbers"),
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
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { appointment } = args;

    const service = await ctx.db.get(appointment.serviceId);
    const barber = await ctx.db.get(appointment.barberId);

    if (!barber) {
      throw new Error("Barber not found", {
        cause: appointment.barberId,
      });
    }

    if (!service) {
      throw new Error("Service not found", {
        cause: appointment.serviceId,
      });
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
          q.eq(q.field("barberId"), appointment.barberId),
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
        throw new Error("Appointment overlaps with existing appointment", {
          cause: appt,
        });
      }
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop)
      throw new Error("Barbershop not found", {
        cause: appointment.barbershopId,
      });

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
      throw new Error("Barbershop is closed on selected day");
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
      throw new Error("Appointment is outside working hours", {
        cause: {
          openAt: dayAvailability.openAt,
          closeAt: dayAvailability.closeAt,
          date: appointment.date,
          endAt,
        },
      });
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
      throw new Error("User profile not found", {
        cause: appointment.userId,
      });
    }

    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barber.userId,
      },
    );

    if (!barberProfile) {
      throw new Error("Barber profile not found", {
        cause: barber.userId,
      });
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

export const getAppointmentsByUserId = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .withIndex("by_userId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointmentsByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .withIndex("by_barbershopId")
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointments = query({
  handler: async (ctx) => {
    const appointments = await ctx.db.query("appointments").collect();

    return appointments;
  },
});

export const getAppointmentByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
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
      throw new Error("User not authenticated", {
        cause: user,
      });
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

export const getAppointmentsByBarberId = query({
  args: {
    barberId: v.id("barbers"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_barberId", (q) => q.eq("barberId", args.barberId))
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointmentsByBarbershopAndRange = query({
  args: {
    barbershopId: v.id("barbershops"),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) =>
        q.and(
          q.lte(q.field("date"), args.endAt),
          q.gte(q.field("date"), args.startAt),
        ),
      )
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", args.barbershopId),
      )
      .order("asc")
      .collect();

    return appointments;
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
      throw new Error("User not authenticated", {
        cause: user,
      });
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
      const barber = await ctx.db.get(appt.barberId);

      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason,
        title,
        body: title,
        senderUserId: barber?.userId ?? "system",
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
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { appointment, appointmentId } = args;

    const original = await ctx.db.get(appointmentId);

    if (!original) {
      throw new Error("Appointment not found", {
        cause: appointmentId,
      });
    }

    const service = await ctx.db.get(appointment.serviceId);

    if (!service) {
      throw new Error("Service not found", {
        cause: appointment.serviceId,
      });
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
      throw new Error("Appointment overlaps with existing appointment", {
        cause: overlap,
      });
    }

    const shop = await ctx.db.get(appointment.barbershopId);

    if (!shop)
      throw new Error("Barbershop not found", {
        cause: appointment.barbershopId,
      });

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
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.date,
        endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    const updatedAppointment = await ctx.db.patch(appointmentId, appointment);
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.date !== appointment.date ||
          original.proposedDate !== appointment.proposedDate));

    const barber = await ctx.db.get(appointment.barberId);

    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        channels: ["sms"],
        reason: "appointment_rescheduled",
        title: "Cita reagendada",
        body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.date).toLocaleDateString()}`,
        senderUserId: barber?.userId ?? "system",
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
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { appointmentId } = args;

    await ctx.db.delete(appointmentId);
  },
});

export const cancelAppointment = mutation({
  args: {
    appointmentId: v.id("appointments"),
    cancelledByUserId: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new Error("Appointment not found");

    await ctx.db.patch(args.appointmentId, {
      status: "cancelled",
      notes: args.reason,
    });

    await ctx.db.insert("notifications", {
      uuid: crypto.randomUUID(),
      channels: ["sms"],
      reason: "appointment_cancelled",
      title: "Cita cancelada",
      body: args.reason ?? "Tu cita ha sido cancelada.",
      senderUserId: args.cancelledByUserId,
      receiverUserId: appt.userId,
      appointmentId: args.appointmentId,
    });
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
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { ok, retryAfter } = await rateLimiter.limit(
      ctx,
      "requestReschedule",
      {
        key: user._id,
      },
    );

    if (!ok) {
      throw new Error(
        `You cannot request a reschedule more than once every 30 minutes. Please try again at ${new Date(Date.now() + retryAfter).toLocaleString()}`,
        {
          cause: retryAfter,
        },
      );
    }

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt) throw new Error("Appointment not found");

    await ctx.db.patch(args.appointmentId, {
      status: "pending",
      notes: args.note,
      proposedDate: args.proposedDate,
    });

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: user.userId ?? "",
      },
    );

    if (!userProfile) {
      throw new Error("User profile not found", {
        cause: appt.userId,
      });
    }

    const barber = await ctx.db.get(appt.barberId);

    if (!barber) {
      throw new Error("Barber not found", {
        cause: appt.barberId,
      });
    }

    const barberProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: barber.userId,
      },
    );

    if (!barberProfile) {
      throw new Error("Barber profile not found", {
        cause: barber.userId,
      });
    }

    const enabledChannels = {
      user: userProfile.notificationsPreferences.filter((n) => n.enabled),
      barber: barberProfile.notificationsPreferences.filter((n) => n.enabled),
    };

    for (const _ of enabledChannels.user) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: "Un cliente ha solicitado un reagendamiento.",
          reason: "appointment_rescheduled_request",
          receiverUserId: barberProfile.userId,
          title: "Solicitud de reagendamiento",
          uuid: crypto.randomUUID(),
          senderUserId: userProfile.userId,
          channels: enabledChannels.barber.map((n) => n.type),
          appointmentId: args.appointmentId,
          preview: "Un cliente ha solicitado un reagendamiento.",
        },
      });
    }

    for (const _ of enabledChannels.barber) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: "Un cliente ha solicitado un reagendamiento.",
          reason: "appointment_rescheduled_request",
          receiverUserId: barberProfile.userId,
          title: "Solicitud de reagendamiento",
          uuid: crypto.randomUUID(),
          senderUserId: userProfile.userId,
          channels: enabledChannels.barber.map((n) => n.type),
          appointmentId: args.appointmentId,
          preview: "Un cliente ha solicitado un reagendamiento.",
        },
      });
    }

    return true;
  },
});

const notificationTexts = {
  appointment_reminder: (barbershopName?: string) =>
    `Tienes una cita en ~30 minutos en ${barbershopName}`,
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
      throw new Error("Barbershop not found", {
        cause: args.barbershopId,
      });
    }

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: args.userId,
      },
    );

    if (!userProfile) {
      throw new Error("User profile not found", {
        cause: args.userId,
      });
    }

    const enabledChannels = {
      user: userProfile.notificationsPreferences.filter((n) => n.enabled),
    };

    for (const _ of enabledChannels.user) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: notificationTexts.appointment_reminder(barbershop?.name),
          reason: "appointment_reminder",
          senderUserId: "system",
          title: notificationTexts.subject,
          uuid: crypto.randomUUID(),
          channels: enabledChannels.user.map((n) => n.type),
          receiverUserId: args.userId,
          appointmentId: args.appointmentId,
          preview: notificationTexts.appointment_reminder(barbershop?.name),
        },
      });
    }

    return true;
  },
});

export const answerRescheduleRequest = mutation({
  args: {
    appointmentId: v.id("appointments"),
    accepted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const appt = await ctx.db.get(args.appointmentId);

    if (!appt)
      throw new Error("Appointment not found", {
        cause: args.appointmentId,
      });

    await ctx.db.patch(args.appointmentId, {
      status: args.accepted ? "confirmed" : "denied",
    });

    const userProfile = await ctx.runQuery(
      internal.userProfileData.getProfileByUserId,
      {
        userId: appt.userId,
      },
    );

    if (!userProfile) {
      throw new Error("User profile not found", {
        cause: appt.userId,
      });
    }

    const title = args.accepted
      ? "Reagendamiento aceptado"
      : "Reagendamiento rechazado";
    const body = args.accepted
      ? "Tu reagendamiento ha sido aceptado."
      : "Tu reagendamiento ha sido rechazado.";
    const reason = args.accepted
      ? "appointment_rescheduled_accepted"
      : "appointment_rescheduled_denied";

    const enabledChannels = {
      user: userProfile.notificationsPreferences.filter((n) => n.enabled),
    };

    for (const _ of enabledChannels.user) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body,
          reason,
          receiverUserId: userProfile.userId,
          title,
          uuid: crypto.randomUUID(),
          senderUserId: "system",
          channels: enabledChannels.user.map((n) => n.type),
          appointmentId: args.appointmentId,
          preview: title,
        },
      });
    }
  },
});

export const getBarbershopAvailability = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const barbershop = await ctx.db.get(args.barbershopId);

    if (!barbershop)
      throw new Error("Barbershop not found", {
        cause: args.barbershopId,
      });

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

    if (!appointment)
      throw new Error("Appointment not found", {
        cause: args.appointmentId,
      });

    const service = await ctx.db.get(appointment.serviceId);

    if (!service)
      throw new Error("Service not found", {
        cause: appointment.serviceId,
      });

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
          q.eq(q.field("barberId"), appointment.barberId),
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
