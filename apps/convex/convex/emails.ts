"use node";

import { Resend } from "@convex-dev/resend";
import {
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
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
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentRescheduleRequestEmail({
        requestUrl: `${process.env.SITE_URL}/profile/appointments/reschedule/${args.appointmentId}`,
        subject: subjects.appointment_rescheduled_request,
        body: args.body,
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
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestAcceptEmail({
        subject: subjects.appointment_rescheduled_accepted,
        body: args.body,
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
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      RescheduleRequestDeniedEmail({
        subject: subjects.appointment_rescheduled_denied,
        body: args.body,
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

export const sendAppointmentCreatedToUserEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "customer",
        subject: subjects.appointment_created,
        body: args.body,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_created,
    });
  },
});

export const sendAppointmentCreatedToBarberEmail = internalAction({
  args: {
    to: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "barber",
        requestUrl: `${process.env.SITE_URL}/profile/barbershops`,
        subject: subjects.appointment_created,
        body: args.body,
      }),
    );

    await resend.sendEmail(ctx, {
      from,
      html,
      to: args.to,
      subject: subjects.appointment_created,
    });
  },
});
