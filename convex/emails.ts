"use node";

import { ConvexError } from "convex/values";
import { render } from "react-email";
import { UseSend } from "usesend-js";
import { z } from "zod";
import {
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  PastAppointmentReminderEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
  WelcomeEmail,
} from "../emails/emails";
import { zInternalAction } from ".";
import { subjects } from "./notifications";

export const from = "Soporte de PanaBarbero <contacto@mail.panabarbero.com>";

const usesend = new UseSend(process.env.USESEND_API_KEY);

async function sendEmail(opts: { to: string; subject: string; html: string }) {
  const { error } = await usesend.emails.send({
    to: opts.to,
    from,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    throw new ConvexError(error.message);
  }
}

export const sendPastAppointmentReminderEmail = zInternalAction({
  args: z.object({
    to: z.string(),
  }),
  handler: async (_ctx, args) => {
    const html = await render(
      PastAppointmentReminderEmail({
        subject: subjects.past_appointment_reminder,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      AppointmentReminderEmail({
        body: args.body,
        subject: subjects.appointment_reminder,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      AppointmentCancelledEmail({
        notes: args.notes,
        subject: subjects.appointment_cancelled,
        body: args.body,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
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

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      RescheduleRequestAcceptEmail({
        subject: subjects.appointment_rescheduled_accepted,
        body: args.body,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      RescheduleRequestDeniedEmail({
        subject: subjects.appointment_rescheduled_denied,
        body: args.body,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "customer",
        subject: args.subject,
        body: args.body,
      }),
    );

    await sendEmail({
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
  handler: async (_ctx, args) => {
    const html = await render(
      AppointmentCreatedEmail({
        sendTo: "barber",
        requestUrl: `${process.env.SITE_URL}/profile/barbershops`,
        subject: args.subject,
        body: args.body,
      }),
    );

    await sendEmail({
      to: args.to,
      subject: args.subject,
      html,
    });
  },
});

export const sendWelcomeEmail = zInternalAction({
  args: z.object({
    to: z.string(),
  }),
  handler: async (_ctx, args) => {
    const html = await render(WelcomeEmail({}));

    await sendEmail({
      to: args.to,
      subject: "¡Bienvenido a PanaBarbero!",
      html,
    });
  },
});
