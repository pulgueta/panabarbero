/* oxlint-disable typescript/no-non-null-assertion -- early return */

import { createFunctionHandle } from "convex/server";
import type {
  FunctionArgs,
  FunctionHandle,
  FunctionReference,
} from "convex/server";
import { ConvexError } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { UnreadTracking } from "convex-unread-tracking";
import { z } from "zod";

import { zInternalMutation } from ".";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  incrementEmailSent,
  incrementSmsSent,
  isEmailLimitNotExceeded,
  isSmsLimitNotExceeded,
  isWhatsappLimitNotExceeded,
} from "./acl";
import { getAppointmentItems, itemsLabel } from "./appointmentItems";
import { errorMessages } from "./errors";
import { buildNotificationCopy, buildSmsBody } from "./notificationCopy";
import type { NotificationCopy } from "./notificationCopy";
import type { Barbershop, InAppNotification, UserProfileData } from "./schema";
import { getProfileByUserId } from "./userProfileData";
import type { Fallback } from "./whatsapp";
import { getApprovedTemplate, sendWhatsApp } from "./whatsapp";
import {
  buildAppointmentCancelled,
  buildAppointmentCreatedBarber,
  buildAppointmentReassignedCustomer,
  buildAppointmentReminderCustomer,
  buildPastAppointmentReminderBarber,
  buildRescheduleRequest,
  buildRescheduleResolved,
  buildReviewInviteCustomer,
  buildServiceRemovedCustomer,
  filterButtonsToTemplate,
} from "./whatsappTemplates";
import type { WhatsAppTemplateSend } from "./whatsappTemplates";

export { subjects } from "./notificationSubjects";

// oxlint-disable-next-line typescript/no-unsafe-argument -- convex-unread-tracking ships no `_generated/component.d.ts`, so `components.unreadTracking` resolves to an error type
export const unreads = new UnreadTracking(components.unreadTracking);

function resolveCustomerEmail(
  appointmentEmail?: string | null,
  profileEmail?: string | null,
) {
  const normalizedAppointmentEmail = appointmentEmail?.trim();
  return normalizedAppointmentEmail || profileEmail || undefined;
}

/**
 * Schedule an SMS via Twilio. With a `barbershopId` the plan's monthly SMS cap
 * is enforced (an internal cost circuit breaker — never shown, never sold):
 * at the cap the SMS is silently skipped, never thrown.
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
  send: () => Promise<Id<"_scheduled_functions">>,
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
 * WhatsApp consent gate. Guests (no profile) never get WhatsApp — consent is
 * profile-level (default ON for new profiles, switchable in the profile).
 */
export function isWhatsAppEnabled(profile: UserProfileData | null) {
  return (
    profile?.notificationsPreferences.some(
      (n) => n.type === "whatsapp" && n.enabled,
    ) ?? false
  );
}

const waDateFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  day: "numeric",
  month: "long",
});

const waTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  timeZone: "America/Bogota",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

/** Email AND SMS — each leg runs when its address/phone exists. */
async function sendFallback(ctx: MutationCtx, fallback: Fallback) {
  if (fallback.email) {
    const email = fallback.email;

    await sendEmail(ctx, fallback.barbershopId, () =>
      ctx.scheduler.runAfter(
        0,
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: `email.handle` is a `createFunctionHandle` result for an internal action (see `emailFallback`), serialized as a string.
        email.handle as FunctionHandle<"action">,
        email.args,
      ),
    );
  }

  if (fallback.phone && fallback.smsBody) {
    await sendSms(ctx, {
      to: fallback.phone,
      body: fallback.smsBody,
      barbershopId: fallback.barbershopId,
    });
  }
}

/** Fallback entry point for the WhatsApp send workflow. */
export const runFallback = zInternalMutation({
  args: z.object({
    fallback: z.object({
      barbershopId: zid("barbershops").optional(),
      phone: z.string().optional(),
      smsBody: z.string().optional(),
      email: z
        .object({ handle: z.string(), args: z.record(z.string(), z.any()) })
        .optional(),
    }),
  }),
  handler: async (ctx, args) => {
    await sendFallback(ctx, args.fallback);
  },
});

/** Serialize an email send so the workflow can run it after a failed send. */
export async function emailFallback<
  Ref extends FunctionReference<"action", "internal">,
>(ref: Ref, args: FunctionArgs<Ref>): Promise<NonNullable<Fallback["email"]>> {
  return { handle: await createFunctionHandle(ref), args };
}

/**
 * Send one notification. WhatsApp when the receiver consented, has a phone,
 * quota remains (allowance → credits) and the template is APPROVED in
 * `es_CO`; otherwise — and whenever the WhatsApp path fails (terminal Meta
 * error, retries exhausted, workflow could not start) — email AND SMS via
 * `sendFallback`. An async `failed` status reported after an accepted send
 * also runs the fallback (`whatsapp.settleDelivery`); silent TTL expiry and
 * quality holds are accepted — no fallback chase.
 */
export async function sendNotification(
  ctx: MutationCtx,
  opts: {
    barbershopId: Barbershop["_id"] | undefined;
    phone: string | undefined;
    receiverProfile: UserProfileData | null;
    template: WhatsAppTemplateSend | null;
    email?: Fallback["email"];
    smsBody?: string;
  },
): Promise<void> {
  const { template, phone } = opts;
  const fallback: Fallback = {
    barbershopId: opts.barbershopId,
    phone,
    smsBody: opts.smsBody,
    email: opts.email,
  };

  if (
    !template ||
    !phone ||
    !isWhatsAppEnabled(opts.receiverProfile) ||
    (opts.barbershopId &&
      !(await isWhatsappLimitNotExceeded(ctx, opts.barbershopId)))
  ) {
    await sendFallback(ctx, fallback);
    return;
  }

  const approved = await getApprovedTemplate(ctx, template.name);

  if (!approved) {
    await sendFallback(ctx, fallback);
    return;
  }

  try {
    await sendWhatsApp(ctx, {
      to: phone,
      templateName: template.name,
      components: filterButtonsToTemplate(
        template.components,
        // oxlint-disable-next-line typescript/no-unsafe-argument -- the component stores synced `components` as `v.any()`; filterButtonsToTemplate parses it with zod
        approved.components,
      ),
      barbershopId: opts.barbershopId,
      fallback,
    });
  } catch {
    await sendFallback(ctx, fallback);
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

    // Booking phone wins for the customer; the barber only ever gets their own.
    const phoneNumber = isCustomer
      ? appointment.contactPhone || customerProfile?.phoneNumber
      : barberProfile.phoneNumber;

    const barbershop = await ctx.db.get(appointment.barbershopId);
    const receiverName = isCustomer
      ? customerProfile?.name || appointment.customerName || "cliente"
      : barberProfile.name || "barbero";

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      phone: phoneNumber,
      receiverProfile,
      template: barbershop
        ? buildAppointmentCancelled({
            receiverName,
            barbershopName: barbershop.name,
            reason: args.notes || "Sin motivo especificado.",
          })
        : null,
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: args.notes,
            sendTo: args.sendTo,
            to: toEmail,
            body,
          })
        : undefined,
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

    const phoneNumber = isCustomer
      ? appointment.contactPhone || customerProfile?.phoneNumber
      : receiverProfile?.phoneNumber;

    const barbershop = await ctx.db.get(appointment.barbershopId);
    const receiverName = isCustomer
      ? customerProfile?.name || appointment.customerName || "cliente"
      : barberProfile.name || "barbero";

    // The interactive template needs the live proposal to bind its buttons.
    const template =
      barbershop && appointment.proposedDate
        ? buildRescheduleRequest({
            role: args.sendTo,
            receiverName,
            barbershopName: barbershop.name,
            oldDate: waDateFormatter.format(new Date(appointment.date)),
            oldTime: waTimeFormatter.format(new Date(appointment.date)),
            newDate: waDateFormatter.format(new Date(appointment.proposedDate)),
            newTime: waTimeFormatter.format(new Date(appointment.proposedDate)),
            appointmentId: appointment._id,
            proposedAt: appointment.proposedDate,
          })
        : null;

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      phone: phoneNumber,
      receiverProfile,
      template,
      email: toEmail
        ? await emailFallback(
            internal.emails.sendAppointmentRescheduleRequestEmail,
            { to: toEmail, body, sendTo: args.sendTo },
          )
        : undefined,
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

    let email: Fallback["email"];

    if (args.to) {
      if (args.accepted) {
        email = await emailFallback(
          internal.emails.sendAppointmentRescheduledAcceptedEmail,
          { to: args.to, body },
        );
      } else if (isCustomer) {
        email = await emailFallback(internal.emails.sendAppointmentCancelled, {
          sendTo: "customer",
          notes: args.notes ?? "Sin motivo especificado.",
          to: args.to,
          body,
        });
      } else {
        email = await emailFallback(
          internal.emails.sendAppointmentRescheduledDeniedEmail,
          { to: args.to, body },
        );
      }
    }

    const phoneNumber = isCustomer
      ? appointment?.contactPhone || receiverProfile?.phoneNumber
      : receiverProfile?.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      phone: phoneNumber,
      receiverProfile,
      template: buildRescheduleResolved({
        receiverName: receiverProfile?.name || "cliente",
        barbershopName: args.barbershopName ?? "la barbería",
        outcome: args.accepted
          ? "El cambio fue aceptado y la cita quedó reprogramada."
          : "El cambio fue rechazado y la cita quedó cancelada.",
      }),
      email,
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

    if (isCustomer) {
      // The customer sees an on-screen confirmation; the approved
      // `appointment_created_customer` template is intentionally unsent
      // (`template: null`), so the fallback carries the confirmation.
      await sendNotification(ctx, {
        barbershopId: appointment?.barbershopId,
        phone: receiverProfile?.phoneNumber ?? args.receiverPhoneNumber,
        receiverProfile,
        template: {
          name: "appointment_created_customer",
          components: [
            {
              type: "header",
              parameters: [{ text: "Cita agendada", type: "text" }],
            },
            {
              type: "button",
              parameters: [
                {
                  type: "payload",
                  payload: "Ver mi cita",
                },
              ],
              sub_type: "quick_reply",
              index: "1",
            },
          ],
        },
        email: to
          ? await emailFallback(
              internal.emails.sendAppointmentCreatedToUserEmail,
              { to, body: receiverBody, subject },
            )
          : undefined,
        smsBody,
      });
    } else {
      const barberPhone = receiverProfile?.phoneNumber;

      const template =
        appointment && args.barbershopName
          ? buildAppointmentCreatedBarber({
              customerName:
                customerProfile?.name ||
                appointment.customerName ||
                "Un cliente",
              barbershopName: args.barbershopName,
              date: waDateFormatter.format(new Date(appointment.date)),
              time: waTimeFormatter.format(new Date(appointment.date)),
              serviceLabel: itemsLabel(
                await getAppointmentItems(ctx, appointment),
              ),
            })
          : null;

      await sendNotification(ctx, {
        barbershopId: appointment?.barbershopId,
        phone: barberPhone,
        receiverProfile,
        template,
        email: to
          ? await emailFallback(
              internal.emails.sendAppointmentCreatedToBarberEmail,
              { to, body: receiverBody, subject },
            )
          : undefined,
        smsBody,
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
    appointmentId: zid("appointments").optional(),
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

    const appointment = args.appointmentId
      ? await ctx.db.get(args.appointmentId)
      : null;
    const phoneNumber =
      appointment?.contactPhone ||
      customerProfile?.phoneNumber ||
      args.receiverPhoneNumber;

    let template: WhatsAppTemplateSend | null = null;

    if (appointment) {
      const barbershopMember = await ctx.db.get(appointment.barbershopMemberId);
      const barberProfile = barbershopMember
        ? await ctx.db.get(barbershopMember.userProfileDataId)
        : null;

      template = buildAppointmentReminderCustomer({
        customerName:
          customerProfile?.name || appointment.customerName || "cliente",
        time: waTimeFormatter.format(new Date(appointment.date)),
        barbershopName: args.barbershopName,
        serviceLabel: itemsLabel(await getAppointmentItems(ctx, appointment)),
        barberName: barberProfile?.name || "tu barbero",
        appointmentId: appointment._id,
        date: appointment.date,
      });
    }

    await sendNotification(ctx, {
      barbershopId: args.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template,
      email: to
        ? await emailFallback(internal.emails.sendAppointmentReminderEmail, {
            to,
            body,
          })
        : undefined,
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
    appointmentId: zid("appointments").optional(),
    barbershopId: zid("barbershops").optional(),
  }),
  handler: async (ctx, args) => {
    const barberProfile = await getProfileByUserId(ctx, args.barberUserId);

    if (!barberProfile) {
      throw new ConvexError(errorMessages.notFound("perfil de barbero"));
    }

    const copy = buildNotificationCopy({ kind: "past_appointment_reminder" });
    const smsBody = buildSmsBody(copy);

    const appointment = args.appointmentId
      ? await ctx.db.get(args.appointmentId)
      : null;

    let template: WhatsAppTemplateSend | null = null;

    if (appointment && !appointment.deletedAt) {
      const customerProfile =
        appointment.userId !== "user_does_not_exist"
          ? await getProfileByUserId(ctx, appointment.userId)
          : null;

      template = buildPastAppointmentReminderBarber({
        barberName: barberProfile.name || "barbero",
        customerName:
          customerProfile?.name || appointment.customerName || "el cliente",
        time: waTimeFormatter.format(new Date(appointment.date)),
        serviceLabel: itemsLabel(await getAppointmentItems(ctx, appointment)),
        appointmentId: appointment._id,
        date: appointment.date,
      });
    }

    await sendNotification(ctx, {
      barbershopId: args.barbershopId ?? appointment?.barbershopId,
      phone: barberProfile.phoneNumber,
      receiverProfile: barberProfile,
      template,
      email: await emailFallback(
        internal.emails.sendPastAppointmentReminderEmail,
        { to: barberProfile.email },
      ),
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

    const phoneNumber = args.contactPhone || customerProfile?.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template: buildAppointmentCancelled({
        receiverName:
          customerProfile?.name || appointment?.customerName || "cliente",
        barbershopName: args.barbershopName,
        reason: `Tu barbero ${args.barberName} ya no está disponible.`,
      }),
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: `Barbero ${args.barberName} eliminado de la barbería`,
            sendTo: "customer",
            to: toEmail,
            body,
          })
        : undefined,
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

    const phoneNumber = args.contactPhone || customerProfile?.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template: buildAppointmentCancelled({
        receiverName:
          customerProfile?.name || appointment?.customerName || "cliente",
        barbershopName: args.barbershopName,
        reason: `El servicio "${args.serviceName}" ya no está disponible.`,
      }),
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentCancelled, {
            notes: `Servicio "${args.serviceName}" eliminado`,
            sendTo: "customer",
            to: toEmail,
            body,
          })
        : undefined,
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

    const phoneNumber = args.contactPhone || customerProfile?.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment?.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template: buildServiceRemovedCustomer({
        customerName:
          customerProfile?.name || appointment?.customerName || "cliente",
        barbershopName: args.barbershopName,
        serviceName: args.serviceName,
      }),
      email: toEmail
        ? await emailFallback(internal.emails.sendAppointmentUpdated, {
            notes: `Servicio "${args.serviceName}" removido de la cita`,
            to: toEmail,
            body,
          })
        : undefined,
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
    const phoneNumber =
      appointment.contactPhone || customerProfile?.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template: buildAppointmentReassignedCustomer({
        customerName:
          customerProfile?.name || appointment.customerName || "cliente",
        barbershopName: args.barbershopName,
        newBarberName: args.newBarberName,
      }),
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
 * In-app-only notice to the assigned barber that the customer tapped
 * "Voy en camino" on the WhatsApp reminder. No barber-side template exists
 * for this (not in the Meta batch), and email/SMS would be noise here.
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
        time: waTimeFormatter.format(new Date(appointment.date)),
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

/**
 * Review invite minted on completion (R6/R7). Registered customers only —
 * the close-out core already skips guests. WhatsApp carries the
 * "Calificar visita" tap; the fallback is SMS + in-app (no review-invite
 * email template exists — the in-app row is the durable pointer).
 */
export const createReviewInvite = zInternalMutation({
  args: z.object({
    appointmentId: zid("appointments"),
  }),
  handler: async (ctx, args) => {
    const appointment = await ctx.db.get(args.appointmentId);

    if (
      !appointment ||
      appointment.deletedAt ||
      appointment.status !== "completed" ||
      appointment.reviewedAt ||
      appointment.userId === "user_does_not_exist"
    ) {
      return;
    }

    const [customerProfile, barbershop, items] = await Promise.all([
      getProfileByUserId(ctx, appointment.userId),
      ctx.db.get(appointment.barbershopId),
      getAppointmentItems(ctx, appointment),
    ]);

    if (!customerProfile || !barbershop) {
      return;
    }

    const serviceLabel = itemsLabel(items);
    const copy = buildNotificationCopy({
      kind: "review_invite",
      barbershopName: barbershop.name,
      barbershopUuid: barbershop.uuid,
      serviceName: serviceLabel,
    });

    const phoneNumber = appointment.contactPhone || customerProfile.phoneNumber;

    await sendNotification(ctx, {
      barbershopId: appointment.barbershopId,
      phone: phoneNumber,
      receiverProfile: customerProfile,
      template: buildReviewInviteCustomer({
        customerName: customerProfile.name || appointment.customerName,
        barbershopName: barbershop.name,
        serviceLabel,
        appointmentId: appointment._id,
      }),
      smsBody: buildSmsBody(copy),
    });

    await recordInApp(ctx, {
      userId: customerProfile.userId,
      copy,
      payload: {
        appointmentId: appointment._id,
        barbershopId: appointment.barbershopId,
        barbershopName: barbershop.name,
        barbershopUuid: barbershop.uuid,
        serviceName: serviceLabel,
      },
    });
  },
});
