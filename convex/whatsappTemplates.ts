/**
 * WhatsApp template map — the single source of truth for every template this
 * app sends. Pure module (no Convex imports) so it stays unit-testable.
 *
 * All templates are Utility • Spanish (COL) in WhatsApp Manager, so every
 * send MUST use language `es_CO` — a different code fails with Meta error
 * 132001 ("template does not exist in the translation").
 *
 * Button `index` is the button's absolute 0-based position in the template
 * (CTAs count). Static URL CTAs need no component entry; every quick reply
 * gets an explicit per-send payload — never rely on the label-as-payload
 * folklore.
 *
 * TTLs noted below are template-level Meta properties: set them in the
 * template submission batch, not at send time. Expiry is silent (no webhook).
 *
 * Copy lives in WhatsApp Manager (WABA `PanaBarbero`), not here. Updated
 * 2026-10-22: five approved templates edited in place and six new ones
 * submitted (see `odd/tasks/whatsapp-launch.md`). `appointment_created_customer`
 * stays approved but intentionally UNSENT (redundant with the on-screen
 * booking confirmation).
 */

import type { Value } from "convex/values";
import { z } from "zod";

import {
  buildCloseoutActionId,
  buildInventoryAckActionId,
  buildOnMyWayActionId,
  buildRescheduleActionId,
  buildReviewInviteActionId,
} from "./whatsappCore";

export const WHATSAPP_TEMPLATE_LANGUAGE = "es_CO";

type WhatsAppTextParameter = { type: "text"; text: string };

export type WhatsAppTemplateComponent =
  | { type: "header"; parameters: Array<WhatsAppTextParameter> }
  | { type: "body"; parameters: Array<WhatsAppTextParameter> }
  | {
      type: "button";
      sub_type: "quick_reply";
      index: string;
      parameters: Array<{ type: "payload"; payload: string }>;
    };

export type WhatsAppTemplateSend = {
  name: string;
  components: WhatsAppTemplateComponent[];
};

/**
 * Meta rejects params with newlines, tabs, or 4+ consecutive spaces, and
 * over-long params fail the whole send — cap defensively (body limit ~1024).
 */
function param(text: string): WhatsAppTextParameter {
  return {
    type: "text",
    text: text.replaceAll(/\s+/g, " ").trim().slice(0, 512),
  };
}

/** A synced template component or button; `type` is lowercased. */
const syncedEntry = z.object({
  type: z.string().transform((type) => type.toLowerCase()),
  buttons: z.array(z.unknown()).optional().catch(undefined),
});

/**
 * Drop per-send quick-reply components the APPROVED template does not have —
 * e.g. while an edited template is still approved in its older shape. A
 * send whose button components don't match the template fails entirely
 * (132012-family), which would silently kill the WhatsApp path while the
 * upfront gate says eligible.
 * Fails open: an unrecognizable synced shape passes components through.
 */
export function filterButtonsToTemplate(
  sendComponents: WhatsAppTemplateComponent[],
  syncedComponents: Value | undefined,
): WhatsAppTemplateComponent[] {
  const synced = z.array(z.unknown()).safeParse(syncedComponents);

  if (!synced.success) {
    return sendComponents;
  }

  const buttonsComponent = synced.data
    .map((component) => syncedEntry.safeParse(component).data)
    .find((component) => component?.type === "buttons");
  const buttons = buttonsComponent?.buttons;

  if (!buttons) {
    return sendComponents;
  }

  return sendComponents.filter((component) => {
    if (component.type !== "button") {
      return true;
    }

    const button = syncedEntry.safeParse(buttons[Number(component.index)]);

    return button.data?.type === "quick_reply";
  });
}

function body(...texts: string[]): WhatsAppTemplateComponent {
  return { type: "body", parameters: texts.map(param) };
}

function quickReply(index: number, payload: string): WhatsAppTemplateComponent {
  return {
    type: "button",
    sub_type: "quick_reply",
    index: String(index),
    parameters: [{ type: "payload", payload }],
  };
}

/**
 * `appointment_reminder_customer` — body {{1}} name, {{2}} time, {{3}} shop,
 * {{4}} service, {{5}} barber. Copy hardcodes "hoy" (fired at T−30 min).
 * Buttons: CTA "Ver mi cita" (0, static) + QR "Voy en camino" (1).
 * Template TTL: 12 h.
 */
export function buildAppointmentReminderCustomer(args: {
  customerName: string;
  time: string;
  barbershopName: string;
  serviceLabel: string;
  barberName: string;
  appointmentId: string;
  date: number;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_reminder_customer_v1",
    components: [
      body(
        args.customerName,
        args.time,
        args.barbershopName,
        args.serviceLabel,
        args.barberName,
      ),
      quickReply(
        1,
        buildOnMyWayActionId({
          appointmentId: args.appointmentId,
          date: args.date,
        }),
      ),
    ],
  };
}

/**
 * `appointment_reschedule_request_customer` /
 * `appointment_reschedule_request_barber` — body {{1}} name, {{2}} shop,
 * {{3}} old date, {{4}} old time, {{5}} new date, {{6}} new time.
 * Buttons: CTA "Revisar cambio" (0, static) + QR "Aceptar cambio" (1) +
 * QR "Rechazar cambio" (2).
 */
export function buildRescheduleRequest(args: {
  role: "customer" | "barber";
  receiverName: string;
  barbershopName: string;
  oldDate: string;
  oldTime: string;
  newDate: string;
  newTime: string;
  appointmentId: string;
  proposedAt: number;
}): WhatsAppTemplateSend {
  const payload = (action: "accept" | "reject") =>
    buildRescheduleActionId({
      action,
      appointmentId: args.appointmentId,
      proposedAt: args.proposedAt,
      role: args.role,
    });

  return {
    name:
      args.role === "customer"
        ? "appointment_reschedule_request_customer"
        : "appointment_reschedule_request_barber",
    components: [
      body(
        args.receiverName,
        args.barbershopName,
        args.oldDate,
        args.oldTime,
        args.newDate,
        args.newTime,
      ),
      quickReply(1, payload("accept")),
      quickReply(2, payload("reject")),
    ],
  };
}

/**
 * `appointment_cancelled` — header {{1}} shop; body {{1}} name, {{2}} shop,
 * {{3}} reason. No buttons. The only template with a header variable.
 * Reused for direct, barber-removed, and service-deleted cancellations.
 */
export function buildAppointmentCancelled(args: {
  receiverName: string;
  barbershopName: string;
  reason: string;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_cancelled",
    components: [
      { type: "header", parameters: [param(args.barbershopName)] },
      body(args.receiverName, args.barbershopName, args.reason),
    ],
  };
}

/**
 * `appointment_created_barber` — body {{1}}
 * customer, {{2}} shop, {{3}} date, {{4}} time, {{5}} service. CTA "Ver
 * agenda" (0, static). No quick replies.
 */
export function buildAppointmentCreatedBarber(args: {
  customerName: string;
  barbershopName: string;
  date: string;
  time: string;
  serviceLabel: string;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_created_barber",
    components: [
      body(
        args.customerName,
        args.barbershopName,
        args.date,
        args.time,
        args.serviceLabel,
      ),
    ],
  };
}

/**
 * `appointment_reschedule_resolved` — body {{1}}
 * name, {{2}} shop, {{3}} outcome sentence. CTA "Ver mi cita" (0, static).
 */
export function buildRescheduleResolved(args: {
  receiverName: string;
  barbershopName: string;
  outcome: string;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_reschedule_resolved",
    components: [body(args.receiverName, args.barbershopName, args.outcome)],
  };
}

/**
 * `past_appointment_reminder_barber` — body {{1}}
 * barber, {{2}} customer, {{3}} time, {{4}} service. QR "Completada" (0) +
 * QR "No asistió" (1). Template TTL: 24 h.
 *
 * Payloads bind the appointment date so a tap after a reschedule decides
 * nothing. Template buttons cannot be hidden per send, so when any line has
 * `priceType: "starting"` (final price required) the handler answers
 * "Completada" by pointing to the app instead of closing the cita.
 */
export function buildPastAppointmentReminderBarber(args: {
  barberName: string;
  customerName: string;
  time: string;
  serviceLabel: string;
  appointmentId: string;
  date: number;
}): WhatsAppTemplateSend {
  const payload = (action: "completed" | "no-show") =>
    buildCloseoutActionId({
      action,
      appointmentId: args.appointmentId,
      date: args.date,
    });

  return {
    name: "past_appointment_reminder_barber",
    components: [
      body(args.barberName, args.customerName, args.time, args.serviceLabel),
      quickReply(0, payload("completed")),
      quickReply(1, payload("no-show")),
    ],
  };
}

/**
 * `review_invite_customer_v1` — body {{1}} name, {{2}} shop, {{3}} service.
 * QR "Calificar visita" (0). The tap opens the 24 h window; the handler
 * answers with the 1–5 interactive list (`review-rate:*` row ids).
 */
export function buildReviewInviteCustomer(args: {
  customerName: string;
  barbershopName: string;
  serviceLabel: string;
  appointmentId: string;
}): WhatsAppTemplateSend {
  return {
    name: "review_invite_customer_v1",
    components: [
      body(args.customerName, args.barbershopName, args.serviceLabel),
      quickReply(
        0,
        buildReviewInviteActionId({ appointmentId: args.appointmentId }),
      ),
    ],
  };
}

/**
 * `appointment_service_removed_customer` — body
 * {{1}} name, {{2}} shop, {{3}} service. CTA "Ver mi cita" (0, static).
 */
export function buildServiceRemovedCustomer(args: {
  customerName: string;
  barbershopName: string;
  serviceName: string;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_service_removed_customer",
    components: [
      body(args.customerName, args.barbershopName, args.serviceName),
    ],
  };
}

/**
 * `appointment_reassigned_customer` — body {{1}}
 * name, {{2}} shop, {{3}} new barber. CTA "Ver mi cita" (0, static).
 */
export function buildAppointmentReassignedCustomer(args: {
  customerName: string;
  barbershopName: string;
  newBarberName: string;
}): WhatsAppTemplateSend {
  return {
    name: "appointment_reassigned_customer",
    components: [
      body(args.customerName, args.barbershopName, args.newBarberName),
    ],
  };
}

/**
 * `inventory_low_stock` — body {{1}} item, {{2}} shop, {{3}} qty, {{4}} unit,
 * {{5}} reorder point. Buttons: CTA "Revisar inventario" (0, static) +
 * QR "Ya hice el pedido" (1, bound to the alert timestamp).
 */
export function buildInventoryLowStock(args: {
  itemName: string;
  barbershopName: string;
  remaining: number;
  unitLabel: string;
  reorderPoint: number;
  levelId: string;
  alertedAt: number;
}): WhatsAppTemplateSend {
  return {
    name: "inventory_low_stock_v1",
    components: [
      body(
        args.itemName,
        args.barbershopName,
        String(args.remaining),
        args.unitLabel,
        String(args.reorderPoint),
      ),
      quickReply(
        1,
        buildInventoryAckActionId({
          levelId: args.levelId,
          alertedAt: args.alertedAt,
        }),
      ),
    ],
  };
}
