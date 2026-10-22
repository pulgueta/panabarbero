/* oxlint-disable typescript/no-non-null-assertion -- false positive */

import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAuthMutation, zInternalMutation, zInternalQuery, zQuery } from ".";
import { internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { assertCanCreateStaffAppointment } from "./acl";
import { track } from "./analytics";
import {
  buildItems,
  conflictDurationMinutes,
  getAppointmentItems,
  itemsLabel,
  itemsTotal,
  itemsTotalDuration,
} from "./appointmentItems";
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
import type { Appointment, Service, UserProfileData } from "./schema";
import {
  appointments,
  barbershopMembers,
  barbershops,
  services,
} from "./schema";
import {
  getProfileByEmail,
  getProfileByUserId,
  upsertNotificationPreference,
} from "./userProfileData";
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
    serviceIds: services.tools.id.shape.id
      .array()
      .min(1, "Selecciona al menos un servicio"),
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
  ratelimit: "createAppointment",
  handler: async (ctx, args) => {
    const { userId } = ctx;

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

    if (
      new Set(appointment.serviceIds).size !== appointment.serviceIds.length
    ) {
      throw new ConvexError(errorMessages.duplicateAppointmentService);
    }

    const [loadedServices, barber] = await Promise.all([
      Promise.all(
        appointment.serviceIds.map((serviceId) => ctx.db.get(serviceId)),
      ),
      ctx.db.get(appointment.barbershopMemberId),
    ]);

    if (!barber?.isActive) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    if (barber.barbershopId !== appointment.barbershopId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    if (!barber.userProfileDataId) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    const selectedServices: Service[] = [];

    for (const service of loadedServices) {
      if (!service) {
        throw new ConvexError(errorMessages.notFound("servicio"));
      }

      if (service.barbershopId !== appointment.barbershopId) {
        throw new ConvexError(errorMessages.unauthorized);
      }

      selectedServices.push(service);
    }

    // The barber must actively offer every selected line — the UI barber
    // filter is only an aid; assignments can change between selection and
    // submit.
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", appointment.barbershopMemberId),
      )
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    const assignedServiceIds = new Set(
      assignments.map((assignment) => assignment.serviceId),
    );

    if (
      !appointment.serviceIds.every((serviceId) =>
        assignedServiceIds.has(serviceId),
      )
    ) {
      throw new ConvexError(errorMessages.barberDoesNotOfferService);
    }

    const items = buildItems(selectedServices);
    const totalDuration = itemsTotalDuration(items);

    const barberProfile = await ctx.db.get(barber.userProfileDataId);
    let customerProfile: UserProfileData | null = null;

    if (contactEmail) {
      customerProfile = await getProfileByEmail(ctx, contactEmail);
    }

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const endsAt = appointment.date + totalDuration * MINUTE_MS;

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

    // Legacy rows (no items) still size their width off the live service.
    const apptServices = await Promise.all(
      candidates.map((appt) =>
        appt.items && appt.items.length > 0 ? null : ctx.db.get(appt.serviceId),
      ),
    );

    for (let i = 0; i < candidates.length; i++) {
      const appt = candidates[i];
      const width = conflictDurationMinutes(appt, () => apptServices[i]);
      const apptEnd = appt.date + width * MINUTE_MS;
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

    if (!dayAvailability?.weekDay.isActive) {
      throw new ConvexError(errorMessages.barbershopClosedOnSelectedDay);
    }

    const endAt = appointment.date + totalDuration * MINUTE_MS;

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
    const {
      isStaffCreated: _isStaffCreated,
      serviceIds: _serviceIds,
      ...withoutIsStaffCreated
    } = appointment;

    // Consent can only come from the customer themself, never from staff
    // booking on their behalf. Stamps `whatsappOptedInAt` on their profile.
    if (!isStaffCreatingAppointment) {
      const ownProfile = await getProfileByUserId(ctx, userId);

      if (ownProfile) {
        await upsertNotificationPreference(ctx, ownProfile, "whatsapp", true);
      }
    }

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
      contactPhone: formatPhoneNumber(withoutIsStaffCreated.contactPhone),
      userId: appointmentUserId,
      status: "confirmed",
      createdBy: createdByMemberId,
      serviceId: items[0].serviceId,
      items,
    });

    // Reserve every line's inventory recipe (never throws, plan-gated no-op).
    await reserveForAppointment(ctx, {
      _id: appointmentId,
      barbershopId: appointment.barbershopId,
      serviceIds: appointment.serviceIds,
      userId: appointmentUserId,
    });

    if (!isStaffCreatingAppointment) {
      await ctx.runMutation(internal.notifications.createAppointmentCreated, {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: appointmentUserId,
        to: barberProfile.email,
        sendTo: "barber",
        barbershopName: barbershop.name,
        receiverPhoneNumber: appointment.contactPhone,
        isStaffCreated: isStaffCreatingAppointment,
      });
    }

    await ctx.runMutation(internal.notifications.createAppointmentCreated, {
      appointmentId,
      barberUserId: barberProfile.userId,
      customerUserId: appointmentUserId,
      to: contactEmail ?? customerProfile?.email,
      sendTo: "customer",
      barbershopName: barbershop.name,
      receiverPhoneNumber: appointment.contactPhone,
      isStaffCreated: isStaffCreatingAppointment,
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
            barberUserId: barberProfile.userId,
            appointmentId,
            barbershopId: appointment.barbershopId,
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
        serviceId: items[0].serviceId,
        serviceIds: appointment.serviceIds,
        itemCount: items.length,
        serviceName: itemsLabel(items),
        servicePrice: itemsTotal(items),
        durationMinutes: totalDuration,
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

export const getByUserId = zQuery({
  args: z.object({
    userId: z.string().optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const userId = await getUserId(ctx);

    // Degrade (don't throw) while the websocket authenticates: this query
    // re-subscribes before Convex auth lands on callback/full-page loads, and
    // a throw here unmounts the whole profile route into its error boundary.
    if (!userId || !args.userId || args.userId !== userId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    const targetUserId = args.userId;

    const result = await ctx.db
      .query("appointments")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
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
  /** Final agreed price per "starting" line — required to complete them. */
  finalPrices: z
    .object({
      serviceId: services.tools.id.shape.id,
      finalPrice: z.number(),
    })
    .array()
    .optional(),
});

type CloseoutStatus = "completed" | "no-show";

/** Statuses that can no longer be closed out (already closed or gone). */
const CLOSED_STATUSES = new Set([
  "completed",
  "no-show",
  "cancelled",
  "denied",
]);

/**
 * Close-out core shared by the authed `setStatus` and the WhatsApp one-tap
 * `closeoutAppointmentFromWhatsApp`. Callers authorize; this applies the
 * status, its side effects, and — on completion for a registered customer —
 * mints the review invite (R6/R7).
 */
async function applyAppointmentCloseout(
  ctx: MutationCtx,
  args: {
    appointment: Appointment;
    status: CloseoutStatus;
    finalPrices?: Array<{ serviceId: Service["_id"]; finalPrice: number }>;
    actorUserId: string;
  },
) {
  const { appointment: appt } = args;
  const appointmentId = appt._id;

  await cancelScheduledNotifications(ctx, appt);

  if (args.status === "no-show") {
    const updatedAppointment = await ctx.db.patch(appointmentId, {
      status: "no-show",
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });

    await releaseForAppointment(ctx, appt);

    await track(ctx, {
      distinctId: args.actorUserId,
      event: "appointment_no_show",
      properties: {
        appointmentId,
        barbershopId: appt.barbershopId,
        serviceId: appt.serviceId,
        barberId: appt.barbershopMemberId,
      },
      groups: { barbershop: appt.barbershopId },
    });

    return updatedAppointment;
  }

  // Every "starting" line needs its agreed final price (≥ the minimum)
  // to complete. Finals are snapshotted onto the row in the SAME
  // transaction as the revenue aggregate write below, so they can never
  // drift apart.
  const items = await getAppointmentItems(ctx, appt);
  const finalByService = new Map(
    (args.finalPrices ?? []).map((entry) => [
      entry.serviceId,
      entry.finalPrice,
    ]),
  );

  const itemsWithFinals = items.map((item) => {
    if (item.priceType !== "starting") {
      return item;
    }

    const finalPrice = item.finalPrice ?? finalByService.get(item.serviceId);

    if (finalPrice === undefined) {
      throw new ConvexError(errorMessages.finalPriceRequired(item.name));
    }

    if (finalPrice < item.price) {
      throw new ConvexError(errorMessages.finalPriceBelowMinimum(item.name));
    }

    return { ...item, finalPrice };
  });

  const updatedAppointment = await ctx.db.patch(appointmentId, {
    status: "completed",
    items: itemsWithFinals,
    upcomingNotificationId: undefined,
    pastReminderNotificationId: undefined,
  });

  // Release the recipe holds and consume the stock the services used.
  await consumeForAppointment(ctx, {
    _id: appointmentId,
    barbershopId: appt.barbershopId,
    userId: appt.userId,
    serviceIds: itemsWithFinals.map((item) => item.serviceId),
  });

  await ctx.runMutation(
    internal.barbershopMetadata.incrementCompletedAppointments,
    {
      barbershopId: appt.barbershopId,
      appointmentId,
    },
  );

  // Only registered customers can review (guests have no session and no
  // phone-authorizable profile). Runs after commit — a failed send must not
  // roll back the close-out.
  if (appt.userId !== "user_does_not_exist") {
    await ctx.scheduler.runAfter(0, internal.notifications.createReviewInvite, {
      appointmentId,
    });
  }

  await track(ctx, {
    distinctId: args.actorUserId,
    event: "appointment_completed",
    properties: {
      appointmentId,
      barbershopId: appt.barbershopId,
      serviceId: appt.serviceId,
      barberId: appt.barbershopMemberId,
    },
    groups: { barbershop: appt.barbershopId },
  });

  return updatedAppointment;
}

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

    await assertShopRole(ctx, appt.barbershopId, userId, [
      "owner",
      "barber",
      "staff",
    ]);

    let updatedAppointment = null;

    switch (args.status) {
      case "completed":
      case "no-show":
        updatedAppointment = await applyAppointmentCloseout(ctx, {
          appointment: appt,
          status: args.status,
          finalPrices: args.finalPrices,
          actorUserId: userId,
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

/**
 * WhatsApp "Completada" / "No asistió" one-tap close-out. Sender phone (from
 * the signed webhook) must match the assigned barber's profile; the payload
 * binds the appointment date so a tap after a reschedule decides nothing.
 * Expected refusals come back as results; an unexpected throw is caught by
 * the inbound handler (`ctx.runMutation` rolls this sub-transaction back).
 */
export const closeoutAppointmentFromWhatsApp = zInternalMutation({
  args: z.object({
    appointmentId: appointments.tools.id.shape.id,
    status: z.enum(["completed", "no-show"]),
    date: z.number(),
    senderPhone: z.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<"applied" | "needs-final-price" | "inactive"> => {
    const appt = await ctx.db.get(args.appointmentId);

    if (
      !appt ||
      appt.deletedAt ||
      appt.date !== args.date ||
      CLOSED_STATUSES.has(appt.status)
    ) {
      return "inactive";
    }

    const barberMember = await ctx.db.get(appt.barbershopMemberId);
    const barberProfile = barberMember
      ? await ctx.db.get(barberMember.userProfileDataId)
      : null;

    if (
      !barberProfile ||
      !phoneMatches(args.senderPhone, barberProfile.phoneNumber)
    ) {
      return "inactive";
    }

    if (args.status === "completed") {
      // A final price cannot be typed into a button tap — send them to the app.
      const items = await getAppointmentItems(ctx, appt);

      if (
        items.some(
          (item) =>
            item.priceType === "starting" && item.finalPrice === undefined,
        )
      ) {
        return "needs-final-price";
      }
    }

    await applyAppointmentCloseout(ctx, {
      appointment: appt,
      status: args.status,
      actorUserId: barberProfile.userId,
    });

    return "applied";
  },
});

/**
 * WhatsApp "Voy en camino" tap on the customer reminder. Phone-authorized
 * against the customer (booking phone or profile), stamped once
 * (`customerOnMyWayAt`) so repeat taps never re-notify the barber.
 */
export const markOnMyWayFromWhatsApp = zInternalMutation({
  args: z.object({
    appointmentId: appointments.tools.id.shape.id,
    date: z.number(),
    senderPhone: z.string(),
  }),
  handler: async (
    ctx,
    args,
  ): Promise<"notified" | "already-notified" | "inactive"> => {
    const appt = await ctx.db.get(args.appointmentId);

    if (
      !appt ||
      appt.deletedAt ||
      appt.date !== args.date ||
      CLOSED_STATUSES.has(appt.status)
    ) {
      return "inactive";
    }

    const customerProfile =
      appt.userId !== "user_does_not_exist"
        ? await getProfileByUserId(ctx, appt.userId)
        : null;

    if (
      !phoneMatches(args.senderPhone, appt.contactPhone) &&
      !phoneMatches(args.senderPhone, customerProfile?.phoneNumber)
    ) {
      return "inactive";
    }

    if (appt.customerOnMyWayAt) {
      return "already-notified";
    }

    await ctx.db.patch(appt._id, { customerOnMyWayAt: Date.now() });

    await ctx.runMutation(internal.notifications.createCustomerOnMyWay, {
      appointmentId: appt._id,
    });

    return "notified";
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

    // Only the appointment's customer or an active shop member may move it.
    await assertCanMutateAppointment(ctx, appt, userId);

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

    const barberProfile = await ctx.db.get(barbershopMember?.userProfileDataId);

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
      barbershopId,
      customerUserId: userProfile?.userId ?? "user_does_not_exist",
      to: appointment.contactEmail,
      receiverPhoneNumber: appointment.contactPhone,
      appointmentId: appointment._id,
    });
  },
});

/**
 * Shared accept/deny core for the authenticated mutation and the WhatsApp
 * quick-reply path. `requireAuthenticatedActor: false` is reserved for the
 * WhatsApp path, which authenticates by phone match + proposal binding
 * before calling in. Returns `false` when the request is gone or stale
 * (non-throwing so webhook retries stay quiet).
 */
async function applyRescheduleDecision(
  ctx: MutationCtx,
  args: {
    appointmentId: Appointment["_id"];
    accepted: boolean;
    actorUserId: string;
    answeredBy: "customer" | "barber";
    requireAuthenticatedActor: boolean;
  },
): Promise<boolean> {
  const appt = await ctx.db.get(args.appointmentId);

  if (!appt || appt.deletedAt) {
    return false;
  }

  // Two-party protocol: the requester cannot answer their own proposal.
  if (
    appt.rescheduleRequestedByUserId &&
    appt.rescheduleRequestedByUserId === args.actorUserId
  ) {
    if (args.requireAuthenticatedActor) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    return false;
  }

  if (args.requireAuthenticatedActor) {
    // The answering side must match the actor: customers answer their own
    // citas, shop members answer for the shop.
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
    const items = await getAppointmentItems(ctx, appt);

    const overlap = await ctx.runQuery(internal.appointments.overlaps, {
      appointment: { id: args.appointmentId },
      date: appt.proposedDate,
      endAt: appt.proposedDate + itemsTotalDuration(items) * MINUTE_MS,
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
          barberUserId: barberProf.userId,
          appointmentId: args.appointmentId,
          barbershopId: appt.barbershopId,
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
    // Denied is terminal: the reminders were armed for the original date —
    // stop them too, then free the recipe holds.
    await cancelScheduledNotifications(ctx, appt);

    await ctx.db.patch(args.appointmentId, {
      status: newStatus,
      proposedDate: undefined,
      rescheduleRequestedByUserId: undefined,
      upcomingNotificationId: undefined,
      pastReminderNotificationId: undefined,
    });

    await releaseForAppointment(ctx, appt);
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

  const receiverEmail =
    (receiverRole === "customer" ? appt.contactEmail : undefined) ??
    receiverProfile?.email ??
    "";

  await ctx.runMutation(
    internal.notifications.createAppointmentRescheduleDecision,
    {
      receiverUserId,
      to: receiverEmail,
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
      appointmentId: args.appointment.id,
      accepted: args.accepted,
      actorUserId: userId,
      answeredBy: args.answeredBy,
      requireAuthenticatedActor: true,
    });
  },
});

function phoneMatches(left: string | undefined, right: string | undefined) {
  if (!left || !right) {
    return false;
  }

  const normalizedLeft = formatPhoneNumber(left);
  const normalizedRight = formatPhoneNumber(right);

  return !!normalizedLeft && normalizedLeft === normalizedRight;
}

/**
 * WhatsApp quick-reply path. The sender phone comes from the signed webhook
 * (trust anchored on WHATSAPP_APP_SECRET); authorization is phone match
 * against the answering side plus the `proposedAt` binding minted into the
 * button payload. Expected refusals return `false`; a throw (e.g. the
 * proposed slot now overlaps another cita) is caught by the inbound handler,
 * so `ctx.runMutation` rolls this sub-transaction back — no half-applied
 * reschedule.
 */
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

    // Stale-button/replay binding: the payload carries the proposal it was
    // minted for; any newer or resolved proposal invalidates it.
    if (appt.proposedDate !== args.proposedAt) {
      return false;
    }

    if (args.answeredBy === "customer") {
      const customerProfile =
        appt.userId !== "user_does_not_exist"
          ? await getProfileByUserId(ctx, appt.userId)
          : null;

      if (
        !phoneMatches(args.senderPhone, appt.contactPhone) &&
        !phoneMatches(args.senderPhone, customerProfile?.phoneNumber)
      ) {
        return false;
      }

      return await applyRescheduleDecision(ctx, {
        appointmentId: args.appointmentId,
        accepted: args.accepted,
        actorUserId: appt.userId,
        answeredBy: "customer",
        requireAuthenticatedActor: false,
      });
    }

    const barberMember = await ctx.db.get(appt.barbershopMemberId);
    const barberProfile = barberMember
      ? await ctx.db.get(barberMember.userProfileDataId)
      : null;

    if (
      !barberProfile ||
      !phoneMatches(args.senderPhone, barberProfile.phoneNumber)
    ) {
      return false;
    }

    return await applyRescheduleDecision(ctx, {
      appointmentId: args.appointmentId,
      accepted: args.accepted,
      actorUserId: barberProfile.userId,
      answeredBy: "barber",
      requireAuthenticatedActor: false,
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
      activeCandidates.map((appt) =>
        appt.items && appt.items.length > 0 ? null : ctx.db.get(appt.serviceId),
      ),
    );

    for (let i = 0; i < activeCandidates.length; i++) {
      const appt = activeCandidates[i];
      const width = conflictDurationMinutes(appt, () => services[i]);
      const apptEnd = appt.date + width * MINUTE_MS;
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
 * Returns available 30-minute time slots for a given barber + date + services.
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
    serviceIds: services.tools.id.shape.id.array(),
    /** Midnight timestamp of the selected date (any time on that day works). */
    date: z.number(),
    /**
     * Snapshot width override (agent reschedule re-check) — skips the live
     * service lookup so lines whose services were deleted can still move.
     */
    durationMinutes: z.number().optional(),
  }),
  handler: async (ctx, args) => {
    // Requested width = Σ live durations, or the snapshot override.
    let serviceDuration = args.durationMinutes ?? 0;

    if (args.durationMinutes === undefined) {
      const loadedServices = await Promise.all(
        args.serviceIds.map((serviceId) => ctx.db.get(serviceId)),
      );

      if (loadedServices.some((service) => !service)) {
        return [];
      }

      serviceDuration = loadedServices.reduce(
        (total, service) => total + (service?.duration ?? 0),
        0,
      );
    }

    if (serviceDuration <= 0) {
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

    if (!dayAvailability?.weekDay.isActive) {
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

    // Generate candidate slots
    const slots: Array<{ time: string; minutes: number }> = [];

    for (
      let min = openMin;
      min + serviceDuration <= closeMin;
      min += SLOT_INTERVAL
    ) {
      const slotEnd = min + serviceDuration;

      // Skip if slot overlaps the lunch break
      if (hasLunch && min < lunchEndMin && slotEnd > lunchStartMin) {
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
      const apptDuration = conflictDurationMinutes(appt, (serviceId) =>
        serviceMap.get(serviceId.toString()),
      );
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
    serviceIds: services.tools.id.shape.id
      .array()
      .min(1, "Selecciona al menos un servicio"),
    barbershopMemberId: barbershopMembers.tools.id.shape.id,
    date: z.number(),
    customerName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
    notes: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    if (new Set(args.serviceIds).size !== args.serviceIds.length) {
      throw new ConvexError(errorMessages.duplicateAppointmentService);
    }

    const [loadedServices, barber, barbershop] = await Promise.all([
      Promise.all(args.serviceIds.map((serviceId) => ctx.db.get(serviceId))),
      ctx.db.get(args.barbershopMemberId),
      ctx.db.get(args.barbershopId),
    ]);

    if (!barber?.isActive)
      throw new ConvexError(errorMessages.notFound("barbero"));
    if (!barbershop) throw new ConvexError(errorMessages.notFound("barbería"));
    if (barber.barbershopId !== args.barbershopId)
      throw new ConvexError(errorMessages.unauthorized);
    if (!barber.userProfileDataId)
      throw new ConvexError(errorMessages.notFound("barbero"));

    const selectedServices: Service[] = [];

    for (const service of loadedServices) {
      if (!service) throw new ConvexError(errorMessages.notFound("servicio"));
      if (service.barbershopId !== args.barbershopId)
        throw new ConvexError(errorMessages.unauthorized);

      selectedServices.push(service);
    }

    // The barber must actively offer every selected line — the UI barber
    // filter is only an aid; assignments can change between selection and
    // submit.
    const assignments = await ctx.db
      .query("barbershopMemberServices")
      .withIndex("by_barbershopMemberId", (q) =>
        q.eq("barbershopMemberId", args.barbershopMemberId),
      )
      .filter((q) => q.neq(q.field("isActive"), false))
      .collect();
    const assignedServiceIds = new Set(
      assignments.map((assignment) => assignment.serviceId),
    );

    if (
      !args.serviceIds.every((serviceId) => assignedServiceIds.has(serviceId))
    ) {
      throw new ConvexError(errorMessages.barberDoesNotOfferService);
    }

    const items = buildItems(selectedServices);
    const totalDuration = itemsTotalDuration(items);

    const barberProfile = await ctx.db.get(barber.userProfileDataId);
    if (!barberProfile)
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));

    const endsAt = args.date + totalDuration * MINUTE_MS;

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
      candidates.map((appt) =>
        appt.items && appt.items.length > 0 ? null : ctx.db.get(appt.serviceId),
      ),
    );

    for (let i = 0; i < candidates.length; i++) {
      const appt = candidates[i];
      const width = conflictDurationMinutes(appt, () => candidateServices[i]);
      const apptEnd = appt.date + width * MINUTE_MS;
      if (appt.date < endsAt && apptEnd > args.date) {
        throw new ConvexError(errorMessages.appointmentOverlaps);
      }
    }

    const appointmentId = await ctx.db.insert("appointments", {
      userId: args.userId,
      barbershopId: args.barbershopId,
      serviceId: items[0].serviceId,
      items,
      barbershopMemberId: args.barbershopMemberId,
      date: args.date,
      customerName: args.customerName,
      contactPhone: formatPhoneNumber(args.contactPhone),
      contactEmail: args.contactEmail,
      notes: args.notes,
      status: "confirmed",
    });

    // Second booking entry point (Pana agent) — reserve here too.
    await reserveForAppointment(ctx, {
      _id: appointmentId,
      barbershopId: args.barbershopId,
      serviceIds: args.serviceIds,
      userId: args.userId,
    });

    const isAnon = args.userId.startsWith(ANON_PREFIX);

    await ctx.runMutation(internal.notifications.createAppointmentCreated, {
      appointmentId,
      barberUserId: barberProfile.userId,
      customerUserId: "user_does_not_exist",
      to: barberProfile.email,
      sendTo: "barber",
      barbershopName: barbershop.name,
      receiverPhoneNumber: args.contactPhone,
      isStaffCreated: false,
    });

    if (!isAnon && args.contactEmail) {
      await ctx.runMutation(internal.notifications.createAppointmentCreated, {
        appointmentId,
        barberUserId: barberProfile.userId,
        customerUserId: args.userId,
        to: args.contactEmail,
        sendTo: "customer",
        barbershopName: barbershop.name,
        receiverPhoneNumber: args.contactPhone,
        isStaffCreated: false,
      });
    }

    await track(ctx, {
      distinctId: args.userId,
      event: "appointment_created",
      properties: {
        appointmentId,
        barbershopId: args.barbershopId,
        source: "agent",
        serviceId: items[0].serviceId,
        serviceIds: args.serviceIds,
        itemCount: items.length,
        serviceName: itemsLabel(items),
        servicePrice: itemsTotal(items),
        durationMinutes: totalDuration,
        barberId: args.barbershopMemberId,
      },
      groups: { barbershop: args.barbershopId },
    });

    return appointmentId;
  },
});
