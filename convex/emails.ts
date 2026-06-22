"use node";

import { ConvexError } from "convex/values";
import { render } from "react-email";
import { UseSend } from "usesend-js";
import { z } from "zod";
import {
  AccountDeletedEmail,
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
  AppointmentReassignedEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  PastAppointmentReminderEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
  ReviewInviteEmail,
  WelcomeEmail,
} from "../emails/emails";
import { zInternalAction } from ".";
import { siteUrl } from "./notificationCopy";
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

export const sendReviewInviteEmail = zInternalAction({
  args: {
    body: z.string(),
    to: z.string(),
    url: z.string(),
  },
  handler: async (_ctx, args) => {
    const html = await render(
      ReviewInviteEmail({
        subject: subjects.review_invite,
        body: args.body,
        url: args.url,
      }),
    );

    await sendEmail({
      to: args.to,
      subject: subjects.review_invite,
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

export const sendAppointmentReassignedEmails = zInternalAction({
  args: z.object({
    notifications: z.array(
      z.object({
        to: z.string(),
        barbershopName: z.string(),
        newBarberName: z.string(),
      }),
    ),
  }),
  handler: async (_ctx, args) => {
    for (const n of args.notifications) {
      const subject = `Tu cita en ${n.barbershopName} ha sido reasignada`;
      const html = await render(
        AppointmentReassignedEmail({
          barbershopName: n.barbershopName,
          newBarberName: n.newBarberName,
        }),
      );
      await sendEmail({ to: n.to, subject, html });
    }
  },
});

export const sendMemberDepartureSummaryToOwner = zInternalAction({
  args: z.object({
    to: z.string(),
    barberName: z.string(),
    barbershopName: z.string(),
    reassignedCount: z.number(),
    cancelledCount: z.number(),
  }),
  handler: async (_ctx, args) => {
    const subject = `Miembro de ${args.barbershopName} eliminó su cuenta`;
    const parts: string[] = [
      `El miembro ${args.barberName} de ${args.barbershopName} ha eliminado su cuenta en PanaBarbero.`,
    ];
    if (args.reassignedCount > 0) {
      parts.push(
        `${args.reassignedCount} cita(s) fueron reasignadas automáticamente a otros barberos disponibles.`,
      );
    }
    if (args.cancelledCount > 0) {
      parts.push(
        `${args.cancelledCount} cita(s) fueron canceladas por falta de disponibilidad. Los clientes fueron notificados.`,
      );
    }
    if (args.reassignedCount === 0 && args.cancelledCount === 0) {
      parts.push("No había citas futuras pendientes afectadas.");
    }
    parts.push(
      "Revisa el panel de tu barbería para ver el estado actualizado de las citas.",
    );

    const html = await render(
      AccountDeletedEmail({
        subject,
        body: parts.join(" "),
        url: siteUrl(),
      }),
    );
    await sendEmail({ to: args.to, subject, html });
  },
});

export const sendAccountDeletedNotifications = zInternalAction({
  args: z.object({
    notifications: z.array(
      z.object({
        to: z.string(),
        barbershopName: z.string(),
        affectedAs: z.enum(["staff", "customer"]),
      }),
    ),
  }),
  handler: async (_ctx, args) => {
    for (const notification of args.notifications) {
      const isStaff = notification.affectedAs === "staff";
      const subject = isStaff
        ? `Barbería ${notification.barbershopName} eliminada`
        : "Tu cita ha sido cancelada";
      const body = isStaff
        ? `Lamentamos informarte que la barbería ${notification.barbershopName} ha cerrado su cuenta y ha sido eliminada de PanaBarbero. Los registros de membresía del equipo han sido eliminados. Si tienes alguna pregunta, contáctanos.`
        : `Lamentamos informarte que tu cita en la barbería ${notification.barbershopName} ha sido cancelada, ya que la barbería ha cerrado su cuenta en PanaBarbero. Te invitamos a explorar otras barberías disponibles en nuestra plataforma.`;

      const html = await render(
        AccountDeletedEmail({ subject, body, url: siteUrl() }),
      );

      await sendEmail({ to: notification.to, subject, html });
    }
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
