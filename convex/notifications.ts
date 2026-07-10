/** biome-ignore-all lint/style/noNonNullAssertion: early return */

import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { UnreadTracking } from "convex-unread-tracking";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import {
  incrementEmailSent,
  incrementSmsSent,
  isEmailLimitNotExceeded,
  isSmsLimitNotExceeded,
} from "./acl";
import { errorMessages } from "./errors";
import {
  buildNotificationCopy,
  buildSmsBody,
  type NotificationCopy,
} from "./notificationCopy";
import { subjects } from "./notificationSubjects";
import type { Barbershop, InAppNotification, UserProfileData } from "./schema";
import { getProfileByUserId } from "./userProfileData";

export { subjects };

export const unreads = new UnreadTracking(components.unreadTracking);

export function isNotificationEnabled(
  channel: UserProfileData["notificationsPreferences"][number]["type"],
  notificationsPreferences: UserProfileData["notificationsPreferences"],
) {
  return notificationsPreferences.some((n) => n.type === channel && n.enabled);
}

function resolveCustomerEmail(
  appointmentEmail?: string | null,
  profileEmail?: string | null,
) {
  const normalizedAppointmentEmail = appointmentEmail?.trim();
  return normalizedAppointmentEmail || profileEmail || undefined;
}

function isCustomerEmailEnabled(customerProfile: UserProfileData | null) {
  return customerProfile
    ? isNotificationEnabled("email", customerProfile.notificationsPreferences)
    : true;
}

/**
 * Schedule an SMS via Twilio while enforcing the barbershop's monthly SMS quota.
 *
 * If `barbershopId` is provided the limit is checked and the counter is
 * incremented. When the quota has been reached the SMS is silently skipped —
 * this function never throws on limit violations.
 * When `barbershopId` is `undefined` (e.g. for notifications that are not
 * scoped to a barbershop) the SMS is sent without quota checks.
 */
async function scheduleSmsWithQuota(
  ctx: MutationCtx,
  opts: {
    to: string;
    body: string;
    barbershopId?: Barbershop["_id"];
  },
): Promise<void> {
  if (opts.barbershopId) {
    const canSend = await isSmsLimitNotExceeded(ctx, opts.barbershopId);

    if (!canSend) {
      return;
    }

    await incrementSmsSent(ctx, opts.barbershopId);
  }

  await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
    body: opts.body,
    to: opts.to,
  });
}

/**
 * Schedule an email while enforcing the barbershop's monthly email quota.
 *
 * If `barbershopId` is provided the limit is checked and the counter is
 * incremented. When the quota has been reached the email is silently skipped —
 * this function never throws on limit violations.
 * When `barbershopId` is `undefined` (e.g. for notifications that are not
 * scoped to a barbershop) the email is sent without quota checks.
 *
 * @param send - A thunk that performs the actual `ctx.scheduler.runAfter` call.
 *               Only invoked when the quota allows it.
 */
async function scheduleEmailWithQuota(
  ctx: MutationCtx,
  barbershopId: Barbershop["_id"] | undefined,
  send: () => Promise<unknown>,
): Promise<void> {
  if (barbershopId) {
    const canSend = await isEmailLimitNotExceeded(ctx, barbershopId);

    if (!canSend) {
      return;
    }

    await incrementEmailSent(ctx, barbershopId);
  }

  await send();
}

/**
 * Persist an in-app notification row for a specific user. Silently ignored
 * for guest/unknown recipients so existing SMS + email paths keep working.
 */
export async function recordInApp(
  ctx: MutationCtx,
  opts: {
    userId: string;
    copy: NotificationCopy;
    payload?: InAppNotification["payload"];
  },
): Promise<void> {
  if (!opts.userId || opts.userId === "user_does_not_exist") {
    return;
  }

  const id = await ctx.db.insert("inAppNotifications", {
    userId: opts.userId,
    kind: opts.copy.kind,
    title: opts.copy.title,
    description: opts.copy.description,
    payload: opts.payload,
  });

  // Register with the unread-tracking component in the same transaction,
  // aligned to the row's _creationTime so watermark comparisons stay exact.
  const doc = await ctx.db.get(id);

  await unreads.insertMessage(ctx, {
    channelId: opts.userId,
    timestamp: doc!._creationTime,
  });
}

export const createAppointmentCancelled = zInternalMutation({
  args: z.object({
    customerUserId: z.string(),
    notes: z.string(),
    appointmentId: zid("appointments"),
    sendTo: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    let customerProfile: UserProfileData | null = null;

    if (appointment.userId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, appointment.userId);
    }

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;

    const toEmail = isCustomer
      ? resolveCustomerEmail(appointment.contactEmail, customerProfile?.email)
      : barberProfile.email;

    const cancellingCustomerName =
      customerProfile?.name ?? appointment.customerName ?? "El cliente";

    const copy = buildNotificationCopy({
      kind: "appointment_cancelled",
      sendTo: args.sendTo,
      customerName: cancellingCustomerName,
      notes: args.notes,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const emailEnabled = receiverProfile
      ? isNotificationEnabled("email", receiverProfile.notificationsPreferences)
      : isCustomer; // Default to enabled for guest customers

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: args.notes,
          sendTo: args.sendTo,
          to: toEmail,
          body,
        }),
      );
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer; // Default to enabled for guest customers

    const phoneNumber =
      receiverProfile?.phoneNumber ?? appointment.contactPhone;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment.barbershopId,
      });
    }

    if (receiverProfile?.userId) {
      await recordInApp(ctx, {
        userId: receiverProfile.userId,
        copy,
        payload: {
          appointmentId: appointment._id,
          barbershopId: appointment.barbershopId,
          customerName: cancellingCustomerName,
          notes: args.notes || undefined,
        },
      });
    }
  },
});

export const createAppointmentRescheduleRequest = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    sendTo: z.enum(["customer", "barber"]),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment) {
      throw new ConvexError(errorMessages.notFound("cita"));
    }

    const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);

    if (!barbershopMember) {
      throw new ConvexError(errorMessages.notFound("barbero"));
    }

    let customerProfile: UserProfileData | null = null;

    if (appointment.userId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, appointment.userId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const barberProfile = await ctx.db.get(barbershopMember.userProfileDataId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;
    const toEmail = isCustomer
      ? resolveCustomerEmail(appointment.contactEmail, customerProfile?.email)
      : barberProfile.email;

    const copy = buildNotificationCopy({
      kind: "appointment_reschedule_request",
      sendTo: args.sendTo,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const emailEnabled = isCustomer
      ? isCustomerEmailEnabled(customerProfile)
      : isNotificationEnabled("email", barberProfile.notificationsPreferences);

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentRescheduleRequestEmail,
          { to: toEmail, body, sendTo: args.sendTo },
        ),
      );
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer;
    const phoneNumber = isCustomer
      ? appointment.contactPhone
      : receiverProfile?.phoneNumber;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment.barbershopId,
      });
    }

    if (receiverProfile?.userId) {
      await recordInApp(ctx, {
        userId: receiverProfile.userId,
        copy,
        payload: {
          appointmentId: appointment._id,
          barbershopId: appointment.barbershopId,
        },
      });
    }
  },
});

export const createAppointmentRescheduleDecision = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    to: z.string(),
    receiverUserId: z.string(),
    accepted: z.boolean(),
    notes: z.string().optional(),
    barbershopName: z.string().optional(),
    role: z.enum(["barber", "customer"]),
  }),
  handler: async (ctx, args) => {
    let receiverProfile = null;

    if (args.receiverUserId !== "user_does_not_exist") {
      receiverProfile = await getProfileByUserId(ctx, args.receiverUserId);
    }

    if (args.receiverUserId !== "user_does_not_exist" && !receiverProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de usuario"));
    }

    const appointment = await ctx.db.get(args.appointmentId);

    const copy = buildNotificationCopy(
      args.accepted
        ? {
            kind: "appointment_reschedule_accepted",
            sendTo: args.role,
          }
        : {
            kind: "appointment_reschedule_denied",
            sendTo: args.role,
            barbershopName: args.barbershopName,
          },
    );

    const isCustomer = args.role === "customer";
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const emailEnabled = receiverProfile
      ? isNotificationEnabled("email", receiverProfile.notificationsPreferences)
      : isCustomer; // Default to enabled for guest customers

    if (emailEnabled && args.to) {
      if (args.accepted) {
        await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
          ctx.scheduler.runAfter(
            0,
            internal.emails.sendAppointmentRescheduledAcceptedEmail,
            { to: args.to, body },
          ),
        );
      } else {
        if (isCustomer) {
          await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
            ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentCancelled,
              {
                sendTo: "customer",
                notes: args.notes ?? "Sin motivo especificado.",
                to: args.to,
                body,
              },
            ),
          );
        } else {
          await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
            ctx.scheduler.runAfter(
              0,
              internal.emails.sendAppointmentRescheduledDeniedEmail,
              { to: args.to, body },
            ),
          );
        }
      }
    }

    const smsEnabled = receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : isCustomer; // Default to enabled for guest customers

    const phoneNumber =
      receiverProfile?.phoneNumber ?? appointment?.contactPhone;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment?.barbershopId,
      });
    }

    if (receiverProfile?.userId && appointment) {
      await recordInApp(ctx, {
        userId: receiverProfile.userId,
        copy,
        payload: {
          appointmentId: appointment._id,
          barbershopId: appointment.barbershopId,
          barbershopName: args.barbershopName,
          notes: args.notes,
        },
      });
    }
  },
});

export const createAppointmentCreated = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    to: z.string().optional(),
    customerUserId: z.string(),
    barberUserId: z.string(),
    sendTo: z.enum(["customer", "barber"]),
    barbershopName: z.string().optional(),
    receiverPhoneNumber: z.string(),
    isStaffCreated: z.boolean(),
  }),
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, args.customerUserId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const appointment = await ctx.db.get(args.appointmentId);

    const isCustomer = args.sendTo === "customer";
    const receiverProfile = isCustomer ? customerProfile : barberProfile;
    const copy = buildNotificationCopy({
      kind: "appointment_created",
      sendTo: args.sendTo,
      barbershopName: args.barbershopName,
    });
    const receiverBody = copy.description;
    const subject = copy.title;
    const smsBody = buildSmsBody(copy);

    const to = isCustomer
      ? resolveCustomerEmail(args.to, customerProfile?.email)
      : (args.to ?? receiverProfile?.email);

    const emailEnabled = isCustomer
      ? isCustomerEmailEnabled(customerProfile)
      : isNotificationEnabled(
          "email",
          receiverProfile?.notificationsPreferences ?? [],
        );

    if (emailEnabled && to) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          isCustomer
            ? internal.emails.sendAppointmentCreatedToUserEmail
            : internal.emails.sendAppointmentCreatedToBarberEmail,
          { to, body: receiverBody, subject },
        ),
      );
    }

    const fallbackPhone =
      receiverProfile?.phoneNumber ?? args.receiverPhoneNumber;

    let smsEnabled = false;

    if (isCustomer) {
      smsEnabled =
        args.isStaffCreated ||
        (receiverProfile
          ? isNotificationEnabled(
              "sms",
              receiverProfile.notificationsPreferences ?? [],
            )
          : true);
    } else {
      smsEnabled = receiverProfile
        ? isNotificationEnabled(
            "sms",
            receiverProfile.notificationsPreferences ?? [],
          )
        : false;
    }

    if (smsEnabled && fallbackPhone) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: fallbackPhone,
        barbershopId: appointment?.barbershopId,
      });
    }

    if (receiverProfile?.userId) {
      await recordInApp(ctx, {
        userId: receiverProfile.userId,
        copy,
        payload: {
          appointmentId: args.appointmentId,
          barbershopId: appointment?.barbershopId,
          barbershopName: args.barbershopName,
        },
      });
    }
  },
});

export const createAppointmentReminder = zInternalMutation({
  args: z.object({
    to: z.string().optional(),
    customerUserId: z.string(),
    barbershopName: z.string(),
    barbershopId: zid("barbershops").optional(),
    receiverPhoneNumber: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    let customerProfile: UserProfileData | null = null;

    if (args.customerUserId !== "user_does_not_exist") {
      customerProfile = await getProfileByUserId(ctx, args.customerUserId);

      if (!customerProfile) {
        throw new ConvexError(errorMessages.notFound("perfil de usuario"));
      }
    }

    const copy = buildNotificationCopy({
      kind: "appointment_reminder",
      barbershopName: args.barbershopName,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const to = resolveCustomerEmail(args.to, customerProfile?.email);
    const emailEnabled = isCustomerEmailEnabled(customerProfile);

    if (emailEnabled && to) {
      await scheduleEmailWithQuota(ctx, args.barbershopId, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendAppointmentReminderEmail,
          {
            to,
            body,
          },
        ),
      );
    }

    const phoneNumber =
      customerProfile?.phoneNumber || args.receiverPhoneNumber;
    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : !!phoneNumber;

    if (smsEnabled && phoneNumber) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: args.barbershopId,
      });
    }

    if (customerProfile?.userId) {
      await recordInApp(ctx, {
        userId: customerProfile.userId,
        copy,
        payload: {
          barbershopId: args.barbershopId,
          barbershopName: args.barbershopName,
        },
      });
    }
  },
});

export const createPastAppointmentReminder = zInternalMutation({
  args: z.object({
    barberUserId: z.string(),
  }),
  handler: async (ctx, args) => {
    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const copy = buildNotificationCopy({ kind: "past_appointment_reminder" });
    const smsBody = buildSmsBody(copy);

    if (
      isNotificationEnabled("email", barberProfile.notificationsPreferences)
    ) {
      await scheduleEmailWithQuota(ctx, undefined, () =>
        ctx.scheduler.runAfter(
          0,
          internal.emails.sendPastAppointmentReminderEmail,
          { to: barberProfile.email },
        ),
      );
    }

    if (
      isNotificationEnabled("sms", barberProfile.notificationsPreferences) &&
      barberProfile.phoneNumber
    ) {
      await ctx.scheduler.runAfter(0, internal.twilio.sendSms, {
        body: smsBody,
        to: barberProfile.phoneNumber,
      });
    }

    await recordInApp(ctx, {
      userId: barberProfile.userId,
      copy,
    });
  },
});

/**
 * In-app-only notice that a submitted review was flagged by moderation and
 * needs the author's attention. Drives the "Reseñas" tab alert badge.
 */
export const createReviewNeedsAttention = zInternalMutation({
  args: z.object({
    reviewId: zid("reviews"),
  }),
  handler: async (ctx, args) => {
    const review = await ctx.db.get(args.reviewId);

    if (!review) {
      return;
    }

    const barbershop = await ctx.db.get(review.barbershopId);

    const copy = buildNotificationCopy({ kind: "review_needs_attention" });

    await recordInApp(ctx, {
      userId: review.userId,
      copy,
      payload: {
        reviewId: review._id,
        barbershopId: review.barbershopId,
        barbershopName: barbershop?.name,
      },
    });
  },
});

/**
 * Notification when an appointment is cancelled because a barber was removed
 * from the barbershop. Sends to the customer via email and SMS.
 */
export const createBarberRemovedCancellation = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    customerUserId: z.string(),
    barberName: z.string(),
    barbershopName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const [customerProfile, appointment] = await Promise.all([
      getProfileByUserId(ctx, args.customerUserId),
      ctx.db.get(args.appointmentId),
    ]);

    const copy = buildNotificationCopy({
      kind: "barber_removed_cancellation",
      barbershopName: args.barbershopName,
      barberName: args.barberName,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const toEmail = resolveCustomerEmail(
      args.contactEmail,
      customerProfile?.email,
    );

    const emailEnabled = customerProfile
      ? isNotificationEnabled("email", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: `Barbero ${args.barberName} eliminado de la barbería`,
          sendTo: "customer",
          to: toEmail,
          body,
        }),
      );
    }

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (smsEnabled) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment?.barbershopId,
      });
    }

    if (customerProfile?.userId) {
      await recordInApp(ctx, {
        userId: customerProfile.userId,
        copy,
        payload: {
          appointmentId: args.appointmentId,
          barbershopId: appointment?.barbershopId,
          barbershopName: args.barbershopName,
          barberName: args.barberName,
        },
      });
    }
  },
});

/**
 * Notification when an appointment is cancelled due to service deletion.
 * Sends to customer via both email and SMS if contact info is available.
 */
export const createServiceDeletedCancellation = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    customerUserId: z.string(),
    serviceName: z.string(),
    barbershopName: z.string(),
    contactPhone: z.string(),
    contactEmail: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const [customerProfile, appointment] = await Promise.all([
      getProfileByUserId(ctx, args.customerUserId),
      ctx.db.get(args.appointmentId),
    ]);

    const copy = buildNotificationCopy({
      kind: "service_deleted_cancellation",
      barbershopName: args.barbershopName,
      serviceName: args.serviceName,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const toEmail = resolveCustomerEmail(
      args.contactEmail,
      customerProfile?.email,
    );

    const emailEnabled = customerProfile
      ? isNotificationEnabled("email", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (emailEnabled && toEmail) {
      await scheduleEmailWithQuota(ctx, appointment?.barbershopId, () =>
        ctx.scheduler.runAfter(0, internal.emails.sendAppointmentCancelled, {
          notes: `Servicio "${args.serviceName}" eliminado`,
          sendTo: "customer",
          to: toEmail,
          body,
        }),
      );
    }

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    const smsEnabled = customerProfile
      ? isNotificationEnabled("sms", customerProfile.notificationsPreferences)
      : true; // Default to enabled for guests

    if (smsEnabled) {
      await scheduleSmsWithQuota(ctx, {
        body: smsBody,
        to: phoneNumber,
        barbershopId: appointment?.barbershopId,
      });
    }

    if (customerProfile?.userId) {
      await recordInApp(ctx, {
        userId: customerProfile.userId,
        copy,
        payload: {
          appointmentId: args.appointmentId,
          barbershopId: appointment?.barbershopId,
          barbershopName: args.barbershopName,
          serviceName: args.serviceName,
        },
      });
    }
  },
});
