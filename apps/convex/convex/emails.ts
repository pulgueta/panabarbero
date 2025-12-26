"use node";

import {
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  BarberInvitationEmail,
  PastAppointmentReminderEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
  WelcomeEmail,
} from "@panabarbero/emails/emails";
import { render } from "@react-email/components";
import { v } from "convex/values";
import { UseSend } from "usesend-js";

import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { subjects } from "./notifications";

const from = "Soporte de PanaBarbero <contacto@panabarbero.com>";

const useSend = new UseSend(process.env.USESEND_API_KEY);

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    html: v.string(),
  },
  handler: async (_, args) => {
    await useSend.emails.send({
      to: args.to,
      from,
      subject: args.subject,
      html: args.html,
    });
  },
});

export const sendWelcomeEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(WelcomeEmail({}));

    await ctx.runAction(internal.emails.sendEmail, {
      subject: "Bienvenido a PanaBarbero",
      to: args.to,
      html,
    });
  },
});

export const sendPastAppointmentReminderEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      PastAppointmentReminderEmail({
        subject: subjects.past_appointment_reminder,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.past_appointment_reminder,
      html,
    });
  },
});

export const sendAppointmentReminderEmail = internalAction({
  args: {
    body: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentReminderEmail({
        body: args.body,
        subject: subjects.appointment_reminder,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.appointment_reminder,
      html,
    });
  },
});

export const sendAppointmentCancelled = internalAction({
  args: {
    sendTo: v.union(v.literal("barber"), v.literal("customer")),
    notes: v.string(),
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCancelledEmail({
        notes: args.notes,
        subject: subjects.appointment_cancelled,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.appointment_cancelled,
      html,
    });
  },
});

export const sendAppointmentRescheduleRequestEmail = internalAction({
  args: {
    to: v.string(),
    appointmentId: v.id("appointments"),
    body: v.string(),
    sendTo: v.union(v.literal("barber"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    const requestUrl =
      args.sendTo === "barber"
        ? `${process.env.SITE_URL}/profile/barbershops/appointments`
        : `${process.env.SITE_URL}/profile?tab=appointments`;

    const html = await render(
      AppointmentRescheduleRequestEmail({
        requestUrl,
        subject: subjects.appointment_rescheduled_request,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.appointment_rescheduled_request,
      html,
    });
  },
});

export const sendAppointmentRescheduledAcceptedEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestAcceptEmail({
        subject: subjects.appointment_rescheduled_accepted,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.appointment_rescheduled_accepted,
      html,
    });
  },
});

export const sendAppointmentRescheduledDeniedEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestDeniedEmail({
        subject: subjects.appointment_rescheduled_denied,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.appointment_rescheduled_denied,
      html,
    });
  },
});

export const sendAppointmentCreatedToUserEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "customer",
        subject: args.subject,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: args.subject,
      html,
    });
  },
});

export const sendAppointmentCreatedToBarberEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "barber",
        requestUrl: `${process.env.SITE_URL}/profile/barbershops`,
        subject: args.subject,
        body: args.body,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: args.subject,
      html,
    });
  },
});

export const sendBarberInvitationEmail = internalAction({
  args: {
    to: v.string(),
    barbershopName: v.string(),
    invitationLink: v.string(),
    inviterName: v.optional(v.string()),
    inviteeName: v.optional(v.string()),
    expiresLabel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const html = await render(
      BarberInvitationEmail({
        barbershopName: args.barbershopName,
        invitationLink: args.invitationLink,
        inviterName: args.inviterName ?? undefined,
        inviteeName: args.inviteeName ?? undefined,
        expiresLabel: args.expiresLabel ?? undefined,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.barber_invited,
      html,
    });
  },
});
