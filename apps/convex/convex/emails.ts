"use node";

import { Resend } from "@convex-dev/resend";
import {
  AppointmentCancelledEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
} from "@panabarbero/emails/emails";
import { render } from "@react-email/components";
import { v } from "convex/values";

import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { subjects } from "./notifications";

export const resend = new Resend(components.resend, {
  testMode: false,
});

const from = "soporte@panabarbero.com";

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render("template(args.emailPayload.props)");

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: args.subject,
    });
  },
});
export const sendAppointmentReminderEmail = internalAction({
  args: {
    barbershopName: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentReminderEmail({
        barbershopName: args.barbershopName,
        subject: subjects.appointment_reminder,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_reminder,
    });
  },
});

export const sendAppointmentCancelled = internalAction({
  args: {
    sendTo: v.union(v.literal("barber"), v.literal("customer")),
    notes: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCancelledEmail({
        notes: args.notes,
        subject: subjects.appointment_cancelled,
        to: args.sendTo,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_cancelled,
    });
  },
});

export const sendAppointmentRescheduleRequestEmail = internalAction({
  args: {
    to: v.string(),
    appointmentId: v.id("appointments"),
    sendTo: v.union(v.literal("barber"), v.literal("customer")),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentRescheduleRequestEmail({
        sendTo: args.sendTo,
        requestUrl: `${process.env.SITE_URL}/profile/appointments/reschedule/${args.appointmentId}`,
        subject: subjects.appointment_rescheduled_request,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_rescheduled_request,
    });
  },
});

export const sendAppointmentRescheduledAcceptedEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestAcceptEmail({
        subject: subjects.appointment_rescheduled_accepted,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_rescheduled_accepted,
    });
  },
});

export const sendAppointmentRescheduledDeniedEmail = internalAction({
  args: {
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestDeniedEmail({
        subject: subjects.appointment_rescheduled_denied,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_rescheduled_denied,
    });
  },
});
