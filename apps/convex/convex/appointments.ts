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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", appointment.barbershopId),
      )
      .filter(({ eq, field, and, lte, gte, or }) =>
        and(
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
      throw new Error("Appointment overlaps with existing appointment", {
        cause: args.appointment.startAt,
      });
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
      throw new Error("Barbershop is closed on selected day", {
        cause: appointment.date,
      });
    }

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours", {
        cause: appointment.date,
      });
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
      .withIndex("by_userId", ({ eq }) => eq("userId", args.userId))
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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", args.barbershopId),
      )
      .order("asc")
      .collect();

    return appointments;
  },
});

export const getAppointments = query({
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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", args.barbershopId),
      )
      .collect();

    return appointments;
  },
});

export const getUserAppointmentsByBarbershopId = query({
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
      .withIndex("by_userId", ({ eq }) => eq("userId", args.userId))
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
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
      .withIndex("by_barberId", ({ eq }) => eq("barberId", args.barberId))
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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", args.barbershopId),
      )
      .filter(({ and, gte, lte, field }) =>
        and(
          lte(field("startAt"), args.endAt),
          gte(field("endAt"), args.startAt),
        ),
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

    if (!appt) {
      throw new Error("Appointment not found", {
        cause: args.appointmentId,
      });
    }

    const titleMap: Record<string, string> = {
      confirmed: "Cita confirmada",
      cancelled: "Cita cancelada",
      completed: "Cita completada",
      "no-show": "Cita marcada como no asistió",
      rescheduled: "Cita reagendada",
      pending: "Cita pendiente",
    };

    const bodyMap: Record<string, string> = {
      confirmed: "Tu cita ha sido confirmada.",
      cancelled: "Tu cita ha sido cancelada.",
      completed: "Tu cita ha sido completada.",
      "no-show": "Tu cita ha sido marcada como no asistió.",
      rescheduled: "Tu cita ha sido reagendada.",
      pending: "Tu cita ha sido pendiente.",
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
      titleMap[args.status as keyof typeof titleMap] ?? "Actualización de cita";
    const barber = await ctx.db.get(appt.barberId);
    const body =
      bodyMap[args.status as keyof typeof bodyMap] ??
      "Tu cita ha sido actualizada.";

    await ctx.runMutation(internal.notifications.createNotification, {
      notification: {
        title,
        uuid: crypto.randomUUID(),
        body,
        reason,
        senderUserId: barber?.userId ?? "system",
        receiverUserId: appt.userId,
        appointmentId: appt._id,
        preview: title,
      },
    });

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
      .withIndex("by_barbershopId", ({ eq }) =>
        eq("barbershopId", appointment.barbershopId),
      )
      .filter(({ eq, field, and, lte, gte, or, neq }) =>
        and(
          eq(field("barberId"), appointment.barberId),
          neq(field("_id"), appointmentId),
          and(
            lte(field("startAt"), appointment.endAt),
            gte(field("endAt"), appointment.startAt),
          ),
          or(eq(field("status"), "pending"), eq(field("status"), "confirmed")),
        ),
      )
      .first();

    if (overlap) {
      throw new Error("Appointment overlaps with existing appointment", {
        cause: appointment.startAt,
      });
    }

    const shop = await ctx.db.get(appointment.barbershopId);

    if (!shop) {
      throw new Error("Barbershop not found", {
        cause: appointment.barbershopId,
      });
    }

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
      throw new Error("Barbershop is closed on selected day", {
        cause: appointment.date,
      });
    }

    if (
      !withinOpenHours(
        dayAvailability.openAt,
        dayAvailability.closeAt,
        appointment.startAt,
        appointment.endAt,
      )
    ) {
      throw new Error("Appointment is outside working hours", {
        cause: appointment.date,
      });
    }

    const updatedAppointment = await ctx.db.patch(appointmentId, appointment);
    const isRescheduled =
      appointment.status === "rescheduled" ||
      (original &&
        (original.startAt !== appointment.startAt ||
          original.endAt !== appointment.endAt));

    const barber = await ctx.db.get(appointment.barberId);

    if (isRescheduled) {
      await ctx.runMutation(internal.notifications.createNotification, {
        notification: {
          body: `Tu cita ha sido reagendada con éxito para el ${new Date(appointment.startAt).toLocaleDateString()}`,
          reason: "appointment_rescheduled",
          senderUserId: barber?.userId ?? "system",
          receiverUserId: appointment.userId,
          appointmentId,
          title: "Cita reagendada",
          preview: "Cita reagendada",
          uuid: crypto.randomUUID(),
        },
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

    const appt = await ctx.db.get(appointmentId);

    if (!appt) {
      throw new Error("Appointment not found", {
        cause: appointmentId,
      });
    }

    await ctx.runMutation(internal.notifications.createNotification, {
      notification: {
        title: "Cita cancelada",
        uuid: crypto.randomUUID(),
        body: "Tu cita ha sido cancelada.",
        reason: "appointment_cancelled",
        receiverUserId: appt.userId,
        senderUserId: "system",
        preview: "Cita cancelada",
        appointmentId: appt._id,
      },
    });
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

    if (!appt) {
      throw new Error("Appointment not found", {
        cause: args.appointmentId,
      });
    }

    await ctx.runMutation(internal.notifications.createNotification, {
      notification: {
        title: "Cita cancelada",
        uuid: crypto.randomUUID(),
        body: args.reason ?? "Tu cita ha sido cancelada.",
        reason: "appointment_cancelled",
        receiverUserId: appt.userId,
        senderUserId: args.cancelledByUserId,
        preview: "Cita cancelada",
        appointmentId: appt._id,
      },
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

    await Promise.all([
      userProfile.notificationsPreferences.map(async () => {
        await ctx.runMutation(internal.notifications.createNotification, {
          notification: {
            body: "Se ha solicitado un reagendamiento para tu cita.",
            reason: "appointment_rescheduled_request",
            receiverUserId: appt.userId,
            title: "Solicitud de reagendamiento",
            uuid: crypto.randomUUID(),
            senderUserId: args.requestedByUserId,
            appointmentId: args.appointmentId,
            preview: "Se ha solicitado un reagendamiento para tu cita.",
          },
        });
      }),
      barberProfile.notificationsPreferences.map(async () => {
        await ctx.runMutation(internal.notifications.createNotification, {
          notification: {
            body: "Un cliente ha solicitado un reagendamiento.",
            reason: "appointment_rescheduled_request",
            receiverUserId: barberProfile.userId,
            title: "Solicitud de reagendamiento",
            uuid: crypto.randomUUID(),
            senderUserId: userProfile.userId,
            appointmentId: args.appointmentId,
            preview: "Un cliente ha solicitado un reagendamiento.",
          },
        });
      }),
    ]);
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
      .withIndex("by_userId", ({ eq }) => eq("userId", args.userId))
      .unique();

    const enabledNotifications =
      userProfileByUserId?.notificationsPreferences.filter((n) => n.enabled);

    if (!enabledNotifications) {
      throw new Error("No enabled notifications found", {
        cause: enabledNotifications,
      });
    }

    await Promise.all(
      enabledNotifications.map(async () => {
        await ctx.runMutation(internal.notifications.createNotification, {
          notification: {
            body: notificationTexts.appointment_reminder(barbershop?.name),
            reason: "appointment_reminder",
            senderUserId: "system",
            title: notificationTexts.subject,
            uuid: crypto.randomUUID(),
            receiverUserId: args.userId,
            appointmentId: args.appointmentId,
            preview: notificationTexts.appointment_reminder(barbershop?.name),
          },
        });
      }),
    );
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

    await Promise.all(
      userProfile.notificationsPreferences.map(async () => {
        await ctx.runMutation(internal.notifications.createNotification, {
          notification: {
            body,
            reason,
            receiverUserId: userProfile.userId,
            title,
            uuid: crypto.randomUUID(),
            senderUserId: "system",
            appointmentId: args.appointmentId,
            preview: title,
          },
        });
      }),
    );
  },
});
