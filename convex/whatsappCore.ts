/**
 * Pure WhatsApp helpers — no Convex imports, unit-testable in plain vitest.
 *
 * Quick-reply payload codec: colon-delimited action ids that are sent as
 * per-send button payloads and come back verbatim in inbound webhook
 * messages. Convex ids never contain `:`, so the delimiter is safe.
 *
 * Every id embeds the state it acts on (`proposedAt`, `alertedAt`) so a stale
 * button from an older proposal/alert decodes fine but is rejected downstream
 * when the embedded timestamp no longer matches the row.
 */

import type { Value } from "convex/values";
import { z } from "zod";

type RescheduleDecision = "accept" | "reject";
type RescheduleRole = "barber" | "customer";
type CloseoutDecision = "completed" | "no-show";

export type WhatsAppActionId =
  | {
      type: "appointment-reschedule";
      role: RescheduleRole;
      action: RescheduleDecision;
      appointmentId: string;
      proposedAt: number;
    }
  | {
      type: "inventory-ack";
      levelId: string;
      alertedAt: number;
    }
  /** "Voy en camino" — bound to the appointment date so a stale tap after a reschedule decides nothing. */
  | {
      type: "appointment-omw";
      appointmentId: string;
      date: number;
    }
  /** "Completada" / "No asistió" one-tap close-out by the barber. */
  | {
      type: "appointment-closeout";
      action: CloseoutDecision;
      appointmentId: string;
      date: number;
    }
  /** "Calificar visita" — conversation starter; the reply is the 1–5 list. */
  | {
      type: "review-invite";
      appointmentId: string;
    }
  /** A row of the 1–5 interactive list sent after "Calificar visita". */
  | {
      type: "review-rate";
      appointmentId: string;
      rating: number;
    };

export function buildRescheduleActionId(args: {
  action: RescheduleDecision;
  appointmentId: string;
  proposedAt: number;
  role: RescheduleRole;
}) {
  return `appointment-reschedule:${args.role}:${args.action}:${args.appointmentId}:${args.proposedAt}`;
}

export function buildInventoryAckActionId(args: {
  levelId: string;
  alertedAt: number;
}) {
  return `inventory-ack:${args.levelId}:${args.alertedAt}`;
}

export function buildOnMyWayActionId(args: {
  appointmentId: string;
  date: number;
}) {
  return `appointment-omw:${args.appointmentId}:${args.date}`;
}

export function buildReviewInviteActionId(args: { appointmentId: string }) {
  return `review-invite:${args.appointmentId}`;
}

export function buildReviewRateActionId(args: {
  appointmentId: string;
  rating: number;
}) {
  return `review-rate:${args.appointmentId}:${args.rating}`;
}

export function buildCloseoutActionId(args: {
  action: CloseoutDecision;
  appointmentId: string;
  date: number;
}) {
  return `appointment-closeout:${args.action}:${args.appointmentId}:${args.date}`;
}

function toInteger(raw: string | undefined): number | null {
  if (!raw) {
    return null;
  }

  const value = Number(raw);

  return Number.isInteger(value) ? value : null;
}

export function parseWhatsAppActionId(id: string): WhatsAppActionId | null {
  const [type, ...rest] = id.split(":");

  if (type === "appointment-reschedule") {
    const [role, action, appointmentId, proposedAtRaw, ...extra] = rest;
    const proposedAt = toInteger(proposedAtRaw);

    if (
      (role !== "barber" && role !== "customer") ||
      (action !== "accept" && action !== "reject") ||
      !appointmentId ||
      proposedAt === null ||
      extra.length > 0
    ) {
      return null;
    }

    return { type, role, action, appointmentId, proposedAt };
  }

  if (type === "inventory-ack") {
    const [levelId, alertedAtRaw, ...extra] = rest;
    const alertedAt = toInteger(alertedAtRaw);

    if (!levelId || alertedAt === null || extra.length > 0) {
      return null;
    }

    return { type, levelId, alertedAt };
  }

  if (type === "appointment-omw") {
    const [appointmentId, dateRaw, ...extra] = rest;
    const date = toInteger(dateRaw);

    if (!appointmentId || date === null || extra.length > 0) {
      return null;
    }

    return { type, appointmentId, date };
  }

  if (type === "appointment-closeout") {
    const [action, appointmentId, dateRaw, ...extra] = rest;
    const date = toInteger(dateRaw);

    if (
      (action !== "completed" && action !== "no-show") ||
      !appointmentId ||
      date === null ||
      extra.length > 0
    ) {
      return null;
    }

    return { type, action, appointmentId, date };
  }

  if (type === "review-invite") {
    const [appointmentId, ...extra] = rest;

    if (!appointmentId || extra.length > 0) {
      return null;
    }

    return { type, appointmentId };
  }

  if (type === "review-rate") {
    const [appointmentId, ratingRaw, ...extra] = rest;
    const rating = toInteger(ratingRaw);

    if (
      !appointmentId ||
      rating === null ||
      rating < 1 ||
      rating > 5 ||
      extra.length > 0
    ) {
      return null;
    }

    return { type, appointmentId, rating };
  }

  return null;
}

/** A non-empty string; any other value reads as absent. */
const replyText = z.string().min(1).optional().catch(undefined);

/** An object carrying the reply id; any other value reads as absent. */
const replySource = z
  .object({ id: replyText, payload: replyText, text: replyText })
  .optional()
  .catch(undefined);

const inboundReply = z.object({
  type: z.string().optional().catch(undefined),
  interactive: z
    .object({
      type: z.string().optional().catch(undefined),
      button_reply: replySource,
      list_reply: replySource,
    })
    .optional()
    .catch(undefined),
  button: replySource,
  button_reply: replySource,
  list_reply: replySource,
  payload: z.string().optional().catch(undefined),
  text: replyText,
});

/**
 * Extract the tapped button/list id from an inbound webhook message payload.
 * Meta delivers four shapes (nested `interactive.button_reply` /
 * `interactive.list_reply`, flat `button`, flat `button_reply`/`list_reply`)
 * depending on message type and template kind — always pass explicit payloads
 * on send so the `button.text` fallback never has to carry meaning.
 *
 * `convex-whatsapp` stores only `msg[msg.type]`: a template quick reply
 * arrives as `{ payload, text }` (no `type` key, row type `"text"`) and an
 * interactive reply as `{ type: "list_reply" | "button_reply", ... }`.
 */
export function getWhatsAppReplyId(payload: Value): string | null {
  const parsed = inboundReply.safeParse(payload);

  if (!parsed.success) {
    return null;
  }

  const data = parsed.data;

  if (data.type === "interactive") {
    const interactive = data.interactive;

    if (!interactive) {
      return null;
    }

    if (interactive.type === "button_reply") {
      return interactive.button_reply?.id ?? null;
    }

    if (interactive.type === "list_reply") {
      return interactive.list_reply?.id ?? null;
    }

    return null;
  }

  if (data.type === "button") {
    return data.button?.payload ?? data.button?.text ?? null;
  }

  if (data.type === "button_reply") {
    return data.button_reply?.id ?? null;
  }

  if (data.type === "list_reply") {
    return data.list_reply?.id ?? null;
  }

  // Stored template quick reply: the inner `button` object itself.
  if (data.payload !== undefined) {
    return data.payload === "" ? (data.text ?? null) : data.payload;
  }

  return null;
}
