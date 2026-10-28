/** biome-ignore-all lint/style/noNonNullAssertion: early return */

import type {
  FunctionArgs,
  FunctionHandle,
  FunctionReference,
} from "convex/server";
import { createFunctionHandle } from "convex/server";
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

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

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

/**
 * Schedule an SMS via Twilio. With a `barbershopId` the plan's monthly SMS cap
 * is enforced: at the cap the SMS is silently skipped, never thrown. Without
 * one (notifications not scoped to a barbershop) the SMS is sent unchecked.
 */
async function sendSms(
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
 * Schedule an email. Same cap semantics as `sendSms` (monthly email cap).
 *
 * @param send - A thunk that performs the actual `ctx.scheduler.runAfter` call.
 *               Only invoked when the cap allows it.
 */
async function sendEmail(
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

/** An email action serialized by `emailFallback`, ready to be scheduled. */
export type NotificationEmail = {
  handle: string;
  args: Record<string, unknown>;
};

/** Serialize an email send so `sendNotification` can schedule it by handle. */
export async function emailFallback<
  Ref extends FunctionReference<"action", "internal">,
>(ref: Ref, args: FunctionArgs<Ref>): Promise<NotificationEmail> {
  return { handle: await createFunctionHandle(ref), args };
}

/**
 * Send one notification over the receiver's enabled channels. Each leg runs
 * when its address/phone exists and the receiver's preference for that
 * channel is on; receivers without a profile (guests) use `guestDefault`.
 * Monthly caps apply per barbershop (see `sendSms` / `sendEmail`). The in-app
 * row and its push stay in `recordInApp`.
 */
export async function sendNotification(
  ctx: MutationCtx,
  opts: {
    barbershopId: Barbershop["_id"] | undefined;
    receiverProfile: UserProfileData | null;
    /** Channel default when the receiver has no profile. Defaults to `true`. */
    guestDefault?: boolean;
    email?: NotificationEmail;
    phone?: string;
    smsBody?: string;
    /** Send the SMS regardless of the receiver's preference. */
    forceSms?: boolean;
  },
): Promise<void> {
  const { receiverProfile } = opts;
  const guestDefault = opts.guestDefault ?? true;

  const emailEnabled = receiverProfile
    ? isNotificationEnabled("email", receiverProfile.notificationsPreferences)
    : guestDefault;

  if (emailEnabled && opts.email) {
    const email = opts.email;

    await sendEmail(ctx, opts.barbershopId, () =>
      ctx.scheduler.runAfter(
        0,
        // SAFETY: `email.handle` is a `createFunctionHandle` result for an
        // internal action (see `emailFallback`), serialized as a string.
        email.handle as FunctionHandle<"action">,
        email.args,
      ),
    );
  }

  const smsEnabled =
    opts.forceSms ||
    (receiverProfile
      ? isNotificationEnabled("sms", receiverProfile.notificationsPreferences)
      : guestDefault);

  if (smsEnabled && opts.phone && opts.smsBody) {
    await sendSms(ctx, {
      to: opts.phone,
      body: opts.smsBody,
      barbershopId: opts.barbershopId,
    });
  }
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

  const profile = await getProfileByUserId(ctx, opts.userId);

  if (
    profile &&
    isNotificationEnabled("push", profile.notificationsPreferences)
  ) {
    const data: Record<string, string> = { kind: opts.copy.kind };

    if (opts.payload?.appointmentId) {
      data.appointmentId = opts.payload.appointmentId;
    }
    if (opts.payload?.barbershopId) {
      data.barbershopId = opts.payload.barbershopId;
    }
    if (opts.payload?.reviewId) {
      data.reviewId = opts.payload.reviewId;
    }

    await ctx.scheduler.runAfter(0, internal.pushTokens.sendPush, {
      userId: opts.userId,
      title: opts.copy.title,
      body: opts.copy.description,
      data,
    });
  }
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

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      receiverProfile,
      guestDefault: isCustomer,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: args.notes,
            sendTo: args.sendTo,
            to: toEmail,
            body,
          })
        : undefined,
      phone: receiverProfile?.phoneNumber ?? appointment.contactPhone,
      smsBody,
    });

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

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      receiverProfile,
      guestDefault: isCustomer,
      email: toEmail
        ? await emailFallback(
            internal.emails.sendAppointmentRescheduleRequestEmail,
            { to: toEmail, body, sendTo: args.sendTo },
          )
        : undefined,
      phone: isCustomer
        ? appointment.contactPhone
        : receiverProfile?.phoneNumber,
      smsBody,
    });

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

    const resolveEmail = async () => {
      if (!args.to) {
        return undefined;
      }

      if (args.accepted) {
        return emailFallback(
          internal.emails.sendAppointmentRescheduledAcceptedEmail,
          { to: args.to, body },
        );
      }

      if (isCustomer) {
        return emailFallback(internal.emails.sendAppointmentCancelled, {
          sendTo: "customer",
          notes: args.notes ?? "Sin motivo especificado.",
          to: args.to,
          body,
        });
      }

      return emailFallback(
        internal.emails.sendAppointmentRescheduledDeniedEmail,
        { to: args.to, body },
      );
    };

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      receiverProfile,
      guestDefault: isCustomer,
      email: await resolveEmail(),
      phone: receiverProfile?.phoneNumber ?? appointment?.contactPhone,
      smsBody,
    });

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

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      receiverProfile,
      guestDefault: isCustomer,
      email: to
        ? await emailFallback(
            isCustomer
              ? internal.emails.sendAppointmentCreatedToUserEmail
              : internal.emails.sendAppointmentCreatedToBarberEmail,
            { to, body: receiverBody, subject },
          )
        : undefined,
      phone: receiverProfile?.phoneNumber ?? args.receiverPhoneNumber,
      smsBody,
      // Staff-created bookings always text the customer their confirmation.
      forceSms: isCustomer && args.isStaffCreated,
    });

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

    await sendNotification(ctx, {
      barbershopId: args.barbershopId,
      receiverProfile: customerProfile,
      email: to
        ? await emailFallback(internal.emails.sendAppointmentReminderEmail, {
            to,
            body,
          })
        : undefined,
      phone: customerProfile?.phoneNumber || args.receiverPhoneNumber,
      smsBody,
    });

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

    // Not scoped to a barbershop: no monthly caps apply.
    await sendNotification(ctx, {
      barbershopId: undefined,
      receiverProfile: barberProfile,
      email: await emailFallback(
        internal.emails.sendPastAppointmentReminderEmail,
        { to: barberProfile.email },
      ),
      phone: barberProfile.phoneNumber,
      smsBody,
    });

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

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      receiverProfile: customerProfile,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: `Barbero ${args.barberName} eliminado de la barbería`,
            sendTo: "customer",
            to: toEmail,
            body,
          })
        : undefined,
      phone: customerProfile?.phoneNumber ?? args.contactPhone,
      smsBody,
    });

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

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      receiverProfile: customerProfile,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: `Servicio "${args.serviceName}" eliminado`,
            sendTo: "customer",
            to: toEmail,
            body,
          })
        : undefined,
      phone: customerProfile?.phoneNumber ?? args.contactPhone,
      smsBody,
    });

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

/**
 * Notification when a multi-service appointment loses one line because that
 * service was deleted. The rest of the cita stays confirmed — copy and email
 * subject say "updated", not "cancelled".
 */
export const createServiceLineRemoved = zInternalMutation({
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
      kind: "service_line_removed",
      barbershopName: args.barbershopName,
      serviceName: args.serviceName,
    });
    const body = copy.description;
    const smsBody = buildSmsBody(copy);

    const toEmail = resolveCustomerEmail(
      args.contactEmail,
      customerProfile?.email,
    );

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      receiverProfile: customerProfile,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentUpdated, {
            notes: `Servicio "${args.serviceName}" removido de la cita`,
            to: toEmail,
            body,
          })
        : undefined,
      phone: customerProfile?.phoneNumber ?? args.contactPhone,
      smsBody,
    });

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

/**
 * Customer notice that a departing barber's cita moved to a colleague (same
 * date and time). One call per reassigned appointment.
 */
export const createAppointmentReassigned = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
    newBarberName: z.string(),
    barbershopName: z.string(),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment || appointment.deletedAt) {
      return;
    }

    const customerProfile =
      appointment.userId !== "user_does_not_exist"
        ? await getProfileByUserId(ctx, appointment.userId)
        : null;

    const copy = buildNotificationCopy({
      kind: "appointment_reassigned",
      barbershopName: args.barbershopName,
      newBarberName: args.newBarberName,
    });
    const smsBody = buildSmsBody(copy);

    const toEmail = resolveCustomerEmail(
      appointment.contactEmail,
      customerProfile?.email,
    );

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      receiverProfile: customerProfile,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentReassignedEmails, {
            notifications: [
              {
                to: toEmail,
                barbershopName: args.barbershopName,
                newBarberName: args.newBarberName,
              },
            ],
          })
        : undefined,
      phone: appointment.contactPhone || customerProfile?.phoneNumber,
      smsBody,
    });

    if (customerProfile?.userId) {
      await recordInApp(ctx, {
        userId: customerProfile.userId,
        copy,
        payload: {
          appointmentId: appointment._id,
          barbershopId: appointment.barbershopId,
          barbershopName: args.barbershopName,
          barberName: args.newBarberName,
        },
      });
    }
  },
});

/**
 * In-app-only notice to the assigned barber that the customer marked they
 * are on their way. Email and SMS would be noise here.
 */
export const createCustomerOnMyWay = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (!appointment || appointment.deletedAt) {
      return;
    }

    const barberMember = await ctx.db.get(appointment.barbershopMemberId);
    const barberProfile = barberMember
      ? await ctx.db.get(barberMember.userProfileDataId)
      : null;

    if (!barberProfile) {
      return;
    }

    const customerProfile =
      appointment.userId !== "user_does_not_exist"
        ? await getProfileByUserId(ctx, appointment.userId)
        : null;
    const barbershop = await ctx.db.get(appointment.barbershopId);
    const customerName =
      customerProfile?.name || appointment.customerName || "Tu cliente";

    await recordInApp(ctx, {
      userId: barberProfile.userId,
      copy: buildNotificationCopy({
        kind: "customer_on_my_way",
        customerName,
        time: timeFormatter.format(new Date(appointment.date)),
      }),
      payload: {
        appointmentId: appointment._id,
        barbershopId: appointment.barbershopId,
        barbershopName: barbershop?.name,
        customerName,
      },
    });
  },
});
