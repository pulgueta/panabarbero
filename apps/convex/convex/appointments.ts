import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation, mutation, query } from "./_generated/server";
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

  return startMin >= openMin && endMin <= closeMin;
}

export const createAppointment = mutation({
  args: {
    appointment: v.object({
      ...tables.appointments,
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

    const appointmentOverlaps = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId")
      .filter(({ eq, field, and, lte, gte, or }) =>
        and(
          eq(field("barbershopId"), appointment.barbershopId),
          eq(field("barberId"), appointment.barberId),
          and(
            lte(field("startAt"), appointment.endAt),
            gte(field("endAt"), appointment.startAt),
          ),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .first();

    if (appointmentOverlaps) {
      throw new Error("Appointment overlaps with existing appointment");
    }

    const barbershop = await ctx.db.get(appointment.barbershopId);

    if (!barbershop) throw new Error("Barbershop not found");

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

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    const appointmentId = await ctx.db.insert("appointments", {
      ...appointment,
      uuid: crypto.randomUUID(),
      status: "confirmed",
    });

    const thirtyMinutesBeforeAppointment = appointment.startAt - 30 * 60 * 1000;

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
          q.lte(q.field("startAt"), args.endAt),
          q.gte(q.field("endAt"), args.startAt),
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
        type: "sms",
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

    const overlap = await ctx.db
      .query("appointments")
      .withIndex("by_barbershopId", (q) =>
        q.eq("barbershopId", appointment.barbershopId),
      )
      .filter((q) =>
        q.and(
          q.eq(q.field("barberId"), appointment.barberId),
          q.neq(q.field("_id"), appointmentId),
          q.and(
            q.lte(q.field("startAt"), appointment.endAt),
            q.gte(q.field("endAt"), appointment.startAt),
          ),
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "confirmed"),
          ),
        ),
      )
      .first();

    if (overlap) {
      throw new Error("Appointment overlaps with existing appointment");
    }

    const shop = await ctx.db.get(appointment.barbershopId);

    if (!shop) throw new Error("Barbershop not found");

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

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours");
    }

    const updatedAppointment = await ctx.db.patch(appointmentId, appointment);
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.startAt !== appointment.startAt ||
          original.endAt !== appointment.endAt));

    const barber = await ctx.db.get(appointment.barberId);

    if (isRescheduled) {
      await ctx.db.insert("notifications", {
        uuid: crypto.randomUUID(),
        type: "sms",
        reason: "appointment_rescheduled",
        title: "Cita reagendada",
        body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.startAt).toLocaleDateString()}`,
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
      type: "sms",
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
    proposedStartAt: v.number(),
    proposedEndAt: v.number(),
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
      proposedStartAt: args.proposedStartAt,
      proposedEndAt: args.proposedEndAt,
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

    for (const notification of userProfile.notificationsPreferences) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: "Un cliente ha solicitado un reagendamiento.",
          reason: "appointment_rescheduled_request",
          receiverUserId: barberProfile.userId,
          title: "Solicitud de reagendamiento",
          uuid: crypto.randomUUID(),
          senderUserId: userProfile.userId,
          type: notification.type,
          appointmentId: args.appointmentId,
          preview: "Un cliente ha solicitado un reagendamiento.",
        },
      });

      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: "Se ha solicitado un reagendamiento para tu cita.",
          reason: "appointment_rescheduled_request",
          receiverUserId: appt.userId,
          title: "Solicitud de reagendamiento",
          uuid: crypto.randomUUID(),
          senderUserId: args.requestedByUserId,
          type: notification.type,
          appointmentId: args.appointmentId,
          preview: "Se ha solicitado un reagendamiento para tu cita.",
        },
      });
    }
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
    const userProfileByUserId = await ctx.db
      .query("userProfileData")
      .withIndex("by_userId")
      .filter(({ eq, field }) => eq(field("userId"), args.userId))
      .unique();

    const enabledNotifications =
      userProfileByUserId?.notificationsPreferences.filter((n) => n.enabled);

    if (!enabledNotifications) {
      throw new Error("No enabled notifications found", {
        cause: enabledNotifications,
      });
    }

    for (const notification of enabledNotifications) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: notificationTexts.appointment_reminder(barbershop?.name),
          reason: "appointment_reminder",
          senderUserId: "system",
          title: notificationTexts.subject,
          uuid: crypto.randomUUID(),
          type: notification.type,
          receiverUserId: args.userId,
          appointmentId: args.appointmentId,
          preview: notificationTexts.appointment_reminder(barbershop?.name),
        },
      });
    }
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

    for (const notification of userProfile.notificationsPreferences) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body,
          reason,
          receiverUserId: userProfile.userId,
          title,
          uuid: crypto.randomUUID(),
          senderUserId: "system",
          type: notification.type,
          appointmentId: args.appointmentId,
          preview: title,
        },
      });
    }
  },
});
