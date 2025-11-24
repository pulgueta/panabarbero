"use node";

import { Resend } from "@convex-dev/resend";
import type {
  AppointmentReminderEmailProps,
  AppointmentRescheduleEmailProps,
} from "@panabarbero/emails/emails";
import {
  AppointmentReminderEmail,
  AppointmentRescheduleEmail,
} from "@panabarbero/emails/emails";
import { render } from "@react-email/components";
import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { ReactNode } from "react";

import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { emailSubjects } from "./notifications";
import { tables } from "./tables";

export const resend = new Resend(components.resend, {
  testMode: false,
});

const emailType = tables.notifications.reason;

type EmailType = Infer<typeof emailType>;

type EmailTemplate = {
  [key in EmailType]: ReactNode;
};

export type EmailPayload =
  | { type: "appointment_reminder"; props: AppointmentReminderEmailProps }
  | { type: "appointment_rescheduled"; props: AppointmentRescheduleEmailProps };

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render("template(args.emailPayload.props)");

    await resend.sendEmail(ctx, {
      from: "no-reply@panabarbero.com",
      html,
      to: args.to,
      subject: args.subject,
    });
  },
});

export const emailTemplates = {
  appointment_reminder: (props: AppointmentReminderEmailProps) =>
    AppointmentReminderEmail(props),
  appointment_rescheduled: (props: AppointmentRescheduleEmailProps) =>
    AppointmentRescheduleEmail(props),
} as unknown as EmailTemplate;

export const sendAppointmentReminderEmail = internalAction({
  args: {
    barbershopName: v.string(),
    to: v.string(),
  },
  handler: async (ctx, args) => {
    const html = await render(
      AppointmentReminderEmail({
        barbershopName: args.barbershopName,
      }),
    );

    await resend.sendEmail(ctx, {
      from: "no-reply@panabarbero.com",
      html,
      to: args.to,
      subject: emailSubjects.appointment_reminder,
    });
  },
});
