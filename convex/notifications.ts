/** biome-ignore-all lint/style/noNonNullAssertion: early return */

import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { UnreadTracking } from "convex-unread-tracking";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import type { MutationCtx } from "./_generated/server";
import { incrementWhatsappSent, isWhatsappLimitNotExceeded } from "./acl";
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

function isWhatsAppEnabled(receiverProfile: UserProfileData | null) {
  if (!receiverProfile) {
    return true;
  }

  const preference = receiverProfile.notificationsPreferences.find(
    (n) => n.type === "whatsapp",
  );

  return preference?.enabled ?? false;
}

function resolveWhatsAppTemplateName(opts: { hasRescheduleAction: boolean }) {
  return opts.hasRescheduleAction
    ? process.env.WHATSAPP_RESCHEDULE_TEMPLATE_NAME
    : process.env.WHATSAPP_NOTIFICATION_TEMPLATE_NAME;
}

/**
 * Schedule a WhatsApp message through the Convex WhatsApp component while
 * enforcing the barbershop's monthly WhatsApp quota.
 */
async function scheduleWhatsAppWithQuota(
  ctx: MutationCtx,
  opts: {
    to: string;
    body: string;
    barbershopId?: Barbershop["_id"];
    rescheduleAction?: {
      appointmentId: string;
      proposedAt: number;
      role: "customer" | "barber";
    };
  },
): Promise<void> {
  const templateName = resolveWhatsAppTemplateName({
    hasRescheduleAction: Boolean(opts.rescheduleAction),
  });

  if (!templateName) {
    console.warn(
      "[whatsapp] Template name not configured; skipping notification. Set WHATSAPP_NOTIFICATION_TEMPLATE_NAME / WHATSAPP_RESCHEDULE_TEMPLATE_NAME.",
    );
    return;
  }

  if (opts.barbershopId) {
    const canSend = await isWhatsappLimitNotExceeded(ctx, opts.barbershopId);

    if (!canSend) {
      return;
    }

    await ctx.runMutation(internal.whatsapp.registerInboundHandler, {});
    await incrementWhatsappSent(ctx, opts.barbershopId);
  }

  await ctx.scheduler.runAfter(0, internal.whatsapp.sendNotification, {
    body: opts.body,
    template: {
      name: templateName,
      language: process.env.WHATSAPP_TEMPLATE_LANGUAGE ?? "es",
    },
    to: opts.to,
    ...(opts.rescheduleAction
      ? { rescheduleAction: opts.rescheduleAction }
      : {}),
  });
}

/**
 * Persist an in-app notification row for a specific user. Silently ignored
 * for guest/unknown recipients so external delivery paths keep working.
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
    const cancellingCustomerName =
      customerProfile?.name ?? appointment.customerName ?? "El cliente";

    const copy = buildNotificationCopy({
      kind: "appointment_cancelled",
      sendTo: args.sendTo,
      customerName: cancellingCustomerName,
      notes: args.notes,
    });
    const body = buildSmsBody(copy);
    const phoneNumber = isCustomer
      ? appointment.contactPhone || receiverProfile?.phoneNumber
      : receiverProfile?.phoneNumber;

    if (isWhatsAppEnabled(receiverProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
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

    const copy = buildNotificationCopy({
      kind: "appointment_reschedule_request",
      sendTo: args.sendTo,
    });
    const body = copy.description;

    const phoneNumber = isCustomer
      ? appointment.contactPhone || receiverProfile?.phoneNumber
      : receiverProfile?.phoneNumber;

    if (
      isWhatsAppEnabled(receiverProfile) &&
      phoneNumber &&
      appointment.proposedDate
    ) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
        to: phoneNumber,
        barbershopId: appointment.barbershopId,
        rescheduleAction: {
          appointmentId: appointment._id,
          proposedAt: appointment.proposedDate,
          role: args.sendTo,
        },
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

    const body = buildSmsBody(copy);
    const phoneNumber =
      args.role === "customer"
        ? appointment?.contactPhone || receiverProfile?.phoneNumber
        : receiverProfile?.phoneNumber;

    if (isWhatsAppEnabled(receiverProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
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
    customerUserId: z.string(),
    barberUserId: z.string(),
    sendTo: z.enum(["customer", "barber"]),
    barbershopName: z.string().optional(),
    receiverPhoneNumber: z.string(),
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
    const body = buildSmsBody(copy);
    const phoneNumber = isCustomer
      ? args.receiverPhoneNumber || receiverProfile?.phoneNumber
      : receiverProfile?.phoneNumber;

    if (isWhatsAppEnabled(receiverProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
        to: phoneNumber,
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
    const body = buildSmsBody(copy);

    const phoneNumber =
      args.receiverPhoneNumber || customerProfile?.phoneNumber;

    if (isWhatsAppEnabled(customerProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
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
    barbershopId: zid("barbershops").optional(),
  }),
  handler: async (ctx, args) => {
    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const copy = buildNotificationCopy({ kind: "past_appointment_reminder" });
    const body = buildSmsBody(copy);

    if (isWhatsAppEnabled(barberProfile) && barberProfile.phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
        to: barberProfile.phoneNumber,
        barbershopId: args.barbershopId,
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
 * from the barbershop. Sends to the customer via WhatsApp.
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
    const body = buildSmsBody(copy);

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    if (isWhatsAppEnabled(customerProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
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
 * Sends to customer via WhatsApp if contact info is available.
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
    const body = buildSmsBody(copy);

    const phoneNumber = customerProfile?.phoneNumber ?? args.contactPhone;

    if (isWhatsAppEnabled(customerProfile) && phoneNumber) {
      await scheduleWhatsAppWithQuota(ctx, {
        body,
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
