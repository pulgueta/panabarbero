"use node";
import { Resend } from "@convex-dev/resend";
import { render } from "@react-email/components";
import type { Infer } from "convex/values";
import { v } from "convex/values";
import type { ReactNode } from "react";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";
import { tables } from "./tables";

export const resend = new Resend(components.resend);

const emailType = tables.notifications.reason;

type EmailType = Infer<typeof emailType>;

type EmailTemplate = {
  [key in EmailType]: ReactNode;
};

export const sendEmail = internalAction({
  args: {
    to: v.string(),
    subject: v.string(),
    emailType,
  },
  handler: async (ctx, args) => {
    const html = await render(emailTemplates[args.emailType]);

    await resend.sendEmail(ctx, {
      from: "noreply@panabarbero.com",
      ...args,
      html,
    });
  },
});

export const emailTemplates = {
  appointment_reminder: "<p>Hello, world!</p>",
  appointment_cancelled: "<p>Hello, world!</p>",
  appointment_rescheduled: "<p>Hello, world!</p>",
  appointment_no_show: "<p>Hello, world!</p>",
  appointment_confirmed: "<p>Hello, world!</p>",
  appointment_rescheduled_request: "<p>Hello, world!</p>",
  appointment_rescheduled_accepted: "<p>Hello, world!</p>",
  appointment_rescheduled_denied: "<p>Hello, world!</p>",
} satisfies EmailTemplate;
