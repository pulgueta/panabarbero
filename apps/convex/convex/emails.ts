"use node";

import { Resend } from "@convex-dev/resend";
import {
  AppointmentCancelledByBarbershopEmail,
  AppointmentCancelledByCustomerEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleByBarbershopEmail,
  AppointmentRescheduleByCustomerEmail,
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

export const sendAppointmentCancelledByBarbershopEmail = internalAction({
  args: {
    barbershopName: v.string(),
    notes: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCancelledByBarbershopEmail({
        barbershopName: args.barbershopName,
        notes: args.notes,
        subject: subjects.appointment_cancelled,
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

export const sendAppointmentCancelledByCustomerEmail = internalAction({
  args: {
    customerName: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentCancelledByCustomerEmail({
        customerName: args.customerName,
        subject: subjects.appointment_cancelled,
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

export const sendAppointmentRescheduleRequestByBarbershopEmail = internalAction(
  {
    args: {
      barbershopName: v.string(),
      to: v.string(),
      appointmentId: v.id("appointments"),
      customerName: v.string(),
    },
    handler: async (ctx, args) => {
      const html = await render(
        AppointmentRescheduleByBarbershopEmail({
          barbershopName: args.barbershopName,
          customerName: args.customerName,
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
  },
);

export const sendAppointmentRescheduleRequestByCustomerEmail = internalAction({
  args: {
    customerName: v.string(),
    to: v.string(),
    appointmentId: v.id("appointments"),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentRescheduleByCustomerEmail({
        customerName: args.customerName,
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
