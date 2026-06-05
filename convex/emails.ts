"use node";

import { Resend } from "@convex-dev/resend";
import { render } from "react-email";
import { z } from "zod";
import {
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  BarberInvitationEmail,
  PastAppointmentReminderEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
} from "../emails/emails";
import { zInternalAction } from ".";
import { components, internal } from "./_generated/api";
import { subjects } from "./notifications";

export const from = "Soporte de PanaBarbero <contacto@panabarbero.com>";

export const resend = new Resend(components.resend, {
  testMode: false,
});

export const sendEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    subject: z.string(),
    html: z.string(),
  }),
  handler: async (ctx, args) => {
    await resend.sendEmail(ctx, {
      to: args.to,
      from,
      subject: args.subject,
      html: args.html,
    });
  },
});

export const sendPastAppointmentReminderEmail = zInternalAction({
  args: z.object({
    to: z.string(),
  }),
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

export const sendAppointmentReminderEmail = zInternalAction({
  args: {
    body: z.string(),
    to: z.string(),
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

export const sendAppointmentCancelled = zInternalAction({
  args: z.object({
    sendTo: z.enum(["barber", "customer"]),
    notes: z.string(),
    to: z.string(),
    body: z.string(),
  }),
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

export const sendAppointmentRescheduleRequestEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
    sendTo: z.enum(["barber", "customer"]),
  }),
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

export const sendAppointmentRescheduledAcceptedEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
  }),
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

export const sendAppointmentRescheduledDeniedEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
  }),
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

export const sendAppointmentCreatedToUserEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
    subject: z.string(),
  }),
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

export const sendAppointmentCreatedToBarberEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
    subject: z.string(),
  }),
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

export const sendBarberInvitationEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    barbershopName: z.string(),
    invitationLink: z.string(),
    inviterName: z.string().optional(),
    expiresLabel: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const html = await render(
      BarberInvitationEmail({
        barbershopName: args.barbershopName,
        invitationLink: args.invitationLink,
        inviterName: args.inviterName ?? undefined,
        expiresLabel: args.expiresLabel ?? undefined,
      }),
    );

    await ctx.runAction(internal.emails.sendEmail, {
      to: args.to,
      subject: subjects.team_invited,
      html,
    });
  },
});
