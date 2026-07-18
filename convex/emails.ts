"use node";

import { sendReactEmail } from "@pulgueta/usesend-convex/react-email";
import { createElement, type ReactElement } from "react";
import { z } from "zod";
import {
  AccountDeletedEmail,
  AppointmentCancelledEmail,
  AppointmentCreatedEmail,
  AppointmentReassignedEmail,
  AppointmentReminderEmail,
  AppointmentRescheduleRequestEmail,
  LowStockEmail,
  PastAppointmentReminderEmail,
  RescheduleRequestAcceptEmail,
  RescheduleRequestDeniedEmail,
  SaleReceiptEmail,
  WelcomeEmail,
} from "../emails/emails";
import { zInternalAction } from ".";
import {
  inventorySalePaymentMethods,
  salePaymentMethodLabels as salePaymentMethodEmailLabels,
} from "./inventorySalesShared";
import {
  deepLinks,
  formatLowStockRemaining,
  siteUrl,
} from "./notificationCopy";
import { subjects } from "./notifications";
import { emailFrom, usesend } from "./usesend";

async function sendEmail(
  ctx: Parameters<typeof sendReactEmail>[1],
  opts: { to: string; subject: string; react: ReactElement },
) {
  await sendReactEmail(usesend, ctx, {
    to: opts.to,
    from: emailFrom,
    subject: opts.subject,
    react: opts.react,
  });
}

export const sendPastAppointmentReminderEmail = zInternalAction({
  args: z.object({
    to: z.string(),
  }),
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.past_appointment_reminder,
      react: PastAppointmentReminderEmail({
        subject: subjects.past_appointment_reminder,
      }),
    });
  },
});

export const sendAppointmentReminderEmail = zInternalAction({
  args: {
    body: z.string(),
    to: z.string(),
  },
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.appointment_reminder,
      react: AppointmentReminderEmail({
        body: args.body,
        subject: subjects.appointment_reminder,
      }),
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
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.appointment_cancelled,
      react: AppointmentCancelledEmail({
        notes: args.notes,
        subject: subjects.appointment_cancelled,
        body: args.body,
      }),
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

    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.appointment_rescheduled_request,
      react: AppointmentRescheduleRequestEmail({
        requestUrl,
        subject: subjects.appointment_rescheduled_request,
        body: args.body,
      }),
    });
  },
});

export const sendAppointmentRescheduledAcceptedEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
  }),
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.appointment_rescheduled_accepted,
      react: RescheduleRequestAcceptEmail({
        subject: subjects.appointment_rescheduled_accepted,
        body: args.body,
      }),
    });
  },
});

export const sendAppointmentRescheduledDeniedEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
  }),
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.appointment_rescheduled_denied,
      react: RescheduleRequestDeniedEmail({
        subject: subjects.appointment_rescheduled_denied,
        body: args.body,
      }),
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
    await sendEmail(ctx, {
      to: args.to,
      subject: args.subject,
      react: AppointmentCreatedEmail({
        sendTo: "customer",
        subject: args.subject,
        body: args.body,
      }),
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
    await sendEmail(ctx, {
      to: args.to,
      subject: args.subject,
      react: AppointmentCreatedEmail({
        sendTo: "barber",
        requestUrl: `${process.env.SITE_URL}/profile/barbershops`,
        subject: args.subject,
        body: args.body,
      }),
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
  handler: async (ctx, args) => {
    for (const n of args.notifications) {
      const subject = `Tu cita en ${n.barbershopName} ha sido reasignada`;
      await sendEmail(ctx, {
        to: n.to,
        subject,
        react: AppointmentReassignedEmail({
          barbershopName: n.barbershopName,
          newBarberName: n.newBarberName,
        }),
      });
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
  handler: async (ctx, args) => {
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

    await sendEmail(ctx, {
      to: args.to,
      subject,
      react: AccountDeletedEmail({
        subject,
        body: parts.join(" "),
        url: siteUrl(),
      }),
    });
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
  handler: async (ctx, args) => {
    for (const notification of args.notifications) {
      const isStaff = notification.affectedAs === "staff";
      const subject = isStaff
        ? `Barbería ${notification.barbershopName} eliminada`
        : "Tu cita ha sido cancelada";
      const body = isStaff
        ? `Lamentamos informarte que la barbería ${notification.barbershopName} ha cerrado su cuenta y ha sido eliminada de PanaBarbero. Los registros de membresía del equipo han sido eliminados. Si tienes alguna pregunta, contáctanos.`
        : `Lamentamos informarte que tu cita en la barbería ${notification.barbershopName} ha sido cancelada, ya que la barbería ha cerrado su cuenta en PanaBarbero. Te invitamos a explorar otras barberías disponibles en nuestra plataforma.`;

      await sendEmail(ctx, {
        to: notification.to,
        subject,
        react: AccountDeletedEmail({ subject, body, url: siteUrl() }),
      });
    }
  },
});

export const sendWelcomeEmail = zInternalAction({
  args: z.object({
    to: z.string(),
  }),
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: "¡Bienvenido a PanaBarbero!",
      react: WelcomeEmail({}),
    });
  },
});

export const sendLowStockEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    itemName: z.string(),
    remaining: z.number(),
    unit: z.string(),
    reorderPoint: z.number(),
    barbershopName: z.string(),
  }),
  handler: async (ctx, args) => {
    await sendEmail(ctx, {
      to: args.to,
      subject: subjects.low_stock,
      react: LowStockEmail({
        subject: subjects.low_stock,
        itemName: args.itemName,
        remainingPhrase: formatLowStockRemaining(args.remaining, args.unit),
        reorderPoint: args.reorderPoint,
        barbershopName: args.barbershopName,
        inventoryUrl: deepLinks.inventory(),
      }),
    });
  },
});

const copFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const saleDateFormatter = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

export const sendSaleReceiptEmail = zInternalAction({
  args: z.object({
    to: z.string(),
    customerName: z.string(),
    customerDocument: z.string().optional(),
    barbershopName: z.string(),
    receiptNumber: z.string(),
    soldAt: z.number(),
    paymentMethod: z.enum(inventorySalePaymentMethods),
    paymentReference: z.string().optional(),
    totalAmount: z.number(),
    lines: z.array(
      z.object({
        name: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
        lineTotal: z.number(),
      }),
    ),
  }),
  handler: async (ctx, args) => {
    const subject = `Recibo de tu compra en ${args.barbershopName}`;

    await sendEmail(ctx, {
      to: args.to,
      subject,
      react: createElement(SaleReceiptEmail, {
        subject,
        barbershopName: args.barbershopName,
        receiptNumber: args.receiptNumber,
        soldAtLabel: saleDateFormatter.format(args.soldAt),
        customerName: args.customerName,
        customerDocument: args.customerDocument,
        lines: args.lines.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          unitPrice: copFormatter.format(line.unitPrice),
          lineTotal: copFormatter.format(line.lineTotal),
        })),
        total: copFormatter.format(args.totalAmount),
        paymentMethodLabel: salePaymentMethodEmailLabels[args.paymentMethod],
        paymentReference: args.paymentReference,
      }),
    });
  },
});
