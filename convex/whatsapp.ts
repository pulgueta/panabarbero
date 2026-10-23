/**
 * WhatsApp transport — the `convex-whatsapp` component client, the durable
 * send workflow, and the Lane-1 inbound handler (deterministic buttons only).
 *
 * Outbound: WhatsApp is the only channel; email + SMS are the silent
 * fallback. `notifications.sendNotification` checks eligibility upfront
 * (consent, phone, quota, approved template) and starts `sendWorkflow`. The
 * send action throws ONLY on Meta error 130429 (rate limit) so the workpool
 * retries just that; a terminal Meta error, or retries exhausted, runs the
 * serialized fallback (email AND SMS, whichever address/phone exists). A
 * duplicate delivery is accepted over a lost one. Metering happens AFTER a
 * successful send (`recordWhatsAppSent`) — a failed send never burns
 * allowance or credits. Five minutes after an accepted send,
 * `settleDelivery` reads the component row and runs the same fallback when
 * Meta reported `failed` asynchronously.
 *
 * Inbound: `onInboundMessage` is registered ONCE in the component config —
 * run `npx convex run whatsapp:registerInboundHandler` once per deployment
 * (idempotent upsert). Webhook retries are absorbed by the
 * `whatsappInboundMessages` processed-marker table, keyed on Meta's message
 * id (purged after 30 days).
 */

import { cleanup, defineWorkflow, start } from "@convex-dev/workflow";
import type { WorkflowId } from "@convex-dev/workflow";
import { createFunctionHandle } from "convex/server";
import type { DefaultFunctionArgs } from "convex/server";
import { v } from "convex/values";
import { zid } from "convex-helpers/server/zod4";
import { isWhatsAppError, WhatsApp } from "convex-whatsapp";
import { z } from "zod";

import { zInternalAction, zInternalMutation, zInternalQuery } from ".";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { incrementWhatsappSent } from "./acl";
import {
  buildReviewRateActionId,
  getWhatsAppReplyId,
  parseWhatsAppActionId,
} from "./whatsappCore";
import { WHATSAPP_TEMPLATE_LANGUAGE } from "./whatsappTemplates";

// oxlint-disable-next-line typescript/no-unsafe-argument -- convex-whatsapp exports `./_generated/component` without the `.js` path the generated api imports, so `components.whatsapp` resolves to an error type
export const whatsapp = new WhatsApp(components.whatsapp);

const DAY_MS = 24 * 60 * 60 * 1000;
const SETTLE_DELAY_MS = 5 * 60 * 1000;
const INBOUND_MARKER_TTL_MS = 30 * DAY_MS;
const INBOUND_MARKER_PURGE_BATCH = 500;

/**
 * es-CO auto-reply for free text (one per 24 h conversation window).
 * Lane 2 (Pana over WhatsApp) will replace this with a real agent.
 */
const CANNED_REPLY =
  "Este chat solo envía avisos. Para gestionar tus citas, usa los botones de los avisos o entra a panabarbero.com.";

/**
 * Serialized fallback — built by the notification mutation at schedule time
 * so the workflow can hand it back when the WhatsApp send fails. Email goes
 * when `email` is set, SMS when `phone` and `smsBody` are both set.
 */
export type Fallback = {
  barbershopId?: Id<"barbershops">;
  phone?: string;
  smsBody?: string;
  /** `createFunctionHandle` of an internal email action + its args. */
  email?: { handle: string; args: DefaultFunctionArgs };
};

const fallbackValidator = v.object({
  barbershopId: v.optional(v.id("barbershops")),
  phone: v.optional(v.string()),
  smsBody: v.optional(v.string()),
  email: v.optional(v.object({ handle: v.string(), args: v.any() })),
});

/**
 * Look up an APPROVED template (name + es_CO) in the component's synced
 * template table. `null` blocks the WhatsApp path and falls back — a PENDING
 * or PAUSED template cannot be sent.
 */
export async function getApprovedTemplate(
  ctx: QueryCtx | MutationCtx,
  name: string,
) {
  const templates = await whatsapp.getTemplates(ctx, "APPROVED");

  return (
    templates.find(
      (template) =>
        template.name === name &&
        template.language === WHATSAPP_TEMPLATE_LANGUAGE,
    ) ?? null
  );
}

/** Enqueue a template send with its fallback. Runs nothing inline. */
export async function sendWhatsApp(
  ctx: MutationCtx,
  input: {
    to: string;
    templateName: string;
    components: unknown[];
    barbershopId?: Id<"barbershops">;
    fallback: Fallback;
  },
): Promise<void> {
  await start(
    ctx,
    internal.whatsapp.sendWorkflow,
    {
      to: input.to,
      templateName: input.templateName,
      components: input.components,
      barbershopId: input.barbershopId,
      fallback: input.fallback,
    },
    {
      startAsync: true,
      onComplete: internal.whatsapp.cleanupSendWorkflow,
      // `null`, not `undefined`: an `undefined` arg is dropped in transit
      // and the required `context` key would then fail validation.
      context: null,
    },
  );
}

/**
 * Delete a finished send workflow's journal (one per notification). Failed or
 * canceled runs are kept for inspection.
 */
const workflowSucceeded = z.object({ kind: z.literal("success") });

export const cleanupSendWorkflow = zInternalMutation({
  args: z.object({
    workflowId: z.string(),
    result: z.any(),
    context: z.null(),
  }),
  handler: async (ctx, args) => {
    if (!workflowSucceeded.safeParse(args.result).success) {
      return;
    }

    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- SAFETY: the workflow component passes its own id to `onComplete` as a plain string arg.
    await cleanup(ctx, components.workflow, args.workflowId as WorkflowId);
  },
});

type SendTemplateResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

/**
 * The raw template send. Throws ONLY on Meta error 130429 so the workflow's
 * workpool retries rate-limit hits; every other failure is returned as a
 * terminal result. On success it returns the component message id, which
 * `settleDelivery` reads later to catch an async `failed` status.
 */
export const sendTemplate = zInternalAction({
  args: z.object({
    to: z.string(),
    templateName: z.string(),
    components: z.unknown().array(),
    language: z.string().optional(),
  }),
  handler: async (ctx, args): Promise<SendTemplateResult> => {
    try {
      const messageId = await whatsapp.send(ctx, {
        to: args.to,
        type: "template",
        template: {
          name: args.templateName,
          language: args.language ?? WHATSAPP_TEMPLATE_LANGUAGE,
          components: args.components,
        },
      });

      return { ok: true, messageId };
    } catch (error) {
      // Unknown runtime failures and transport errors (fetch timeout after
      // Meta may have accepted the message) are retried by the workpool;
      // once retries are exhausted the workflow runs the fallback anyway
      // (a duplicate beats a lost notice). Meta-typed rejections other than
      // 130429 are terminal and trigger the fallback at once.
      if (!isWhatsAppError(error)) {
        throw error;
      }

      if (error.data.code === 130429 || error.data.type === "NetworkError") {
        throw error;
      }

      return {
        ok: false,
        error: `${error.data.code}: ${error.data.message}`,
      };
    }
  },
});

export const sendWorkflow = defineWorkflow(components.workflow, {
  args: {
    to: v.string(),
    templateName: v.string(),
    components: v.array(v.any()),
    barbershopId: v.optional(v.id("barbershops")),
    fallback: fallbackValidator,
  },
  workpoolOptions: {
    retryActionsByDefault: true,
    defaultRetryBehavior: {
      maxAttempts: 4,
      initialBackoffMs: 1_000,
      base: 2,
    },
  },
}).handler(async (step, args) => {
  let messageId: string | null = null;

  try {
    const result: SendTemplateResult = await step.runAction(
      internal.whatsapp.sendTemplate,
      {
        to: args.to,
        templateName: args.templateName,
        components: args.components,
      },
      { name: `wa:${args.templateName}` },
    );
    messageId = result.ok ? result.messageId : null;
  } catch {
    // Retries exhausted (transport error, local throw) — fall back.
  }

  if (messageId) {
    if (args.barbershopId) {
      await step.runMutation(internal.whatsapp.recordWhatsAppSent, {
        barbershopId: args.barbershopId,
      });
    }

    await step.runMutation(
      internal.whatsapp.settleDelivery,
      { messageId, fallback: args.fallback },
      { runAfter: SETTLE_DELAY_MS },
    );

    return;
  }

  await step.runMutation(internal.notifications.runFallback, {
    fallback: args.fallback,
  });
});

export const recordWhatsAppSent = zInternalMutation({
  args: z.object({
    barbershopId: zid("barbershops"),
  }),
  handler: async (ctx, args) => {
    await incrementWhatsappSent(ctx, args.barbershopId);
  },
});

/**
 * Async delivery check. Meta can accept a send and report `failed` later via
 * the status webhook; the component stores that on its `messages` row but has
 * no callback. A `failed` row runs the same fallback as a send failure (no
 * metering refund); any other status counts as delivered. Known gaps: a
 * status webhook that arrives before the component records `waMessageId` is
 * dropped by the component, and a TTL expiry never produces a `failed` status.
 */
export const settleDelivery = zInternalMutation({
  args: z.object({
    messageId: z.string(),
    fallback: z.object({
      barbershopId: zid("barbershops").optional(),
      phone: z.string().optional(),
      smsBody: z.string().optional(),
      email: z
        .object({ handle: z.string(), args: z.record(z.string(), z.any()) })
        .optional(),
    }),
  }),
  handler: async (ctx, args) => {
    const message = await whatsapp.getMessage(ctx, args.messageId);

    if (message?.status !== "failed") {
      return;
    }

    await ctx.runMutation(internal.notifications.runFallback, {
      fallback: args.fallback,
    });
  },
});

/**
 * Free-form reply inside an open 24 h service window. Never metered, never
 * retried — a lost reply is acceptable, a duplicate is not.
 */
export const sendText = zInternalAction({
  args: z.object({
    to: z.string(),
    body: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await whatsapp.send(ctx, {
        to: args.to,
        type: "text",
        text: { body: args.body },
      });
    } catch {
      // Best-effort — the action already happened; only the confirmation is lost.
    }
  },
});

const RATING_ROWS = [
  { rating: 5, title: "5 · Excelente" },
  { rating: 4, title: "4 · Muy bien" },
  { rating: 3, title: "3 · Bien" },
  { rating: 2, title: "2 · Regular" },
  { rating: 1, title: "1 · Mal" },
];

/**
 * The 1–5 rating list sent inside the window a "Calificar visita" tap opens.
 * Row ids carry `review-rate:<appointmentId>:<rating>`. Never metered; a
 * lost list is acceptable (the in-app invite remains), a duplicate is not.
 */
export const sendRatingList = zInternalAction({
  args: z.object({
    to: z.string(),
    appointmentId: z.string(),
    barbershopName: z.string(),
  }),
  handler: async (ctx, args) => {
    try {
      await whatsapp.send(ctx, {
        to: args.to,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: `¿Cómo estuvo tu visita a ${args.barbershopName}? Elige una calificación.`,
          },
          action: {
            button: "Calificar",
            sections: [
              {
                rows: RATING_ROWS.map((row) => ({
                  id: buildReviewRateActionId({
                    appointmentId: args.appointmentId,
                    rating: row.rating,
                  }),
                  title: row.title,
                })),
              },
            ],
          },
        },
      });
    } catch {
      // Best-effort — see sendText.
    }
  },
});

/**
 * One-time registration of the inbound handler in the component config.
 * Idempotent (component-side upsert). Run once per deployment:
 * `npx convex run whatsapp:registerInboundHandler`.
 */
export const registerInboundHandler = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const handle = await createFunctionHandle(
      internal.whatsapp.onInboundMessage,
    );

    await whatsapp.registerInboundHandler(ctx, handle);
  },
});

async function scheduleReply(ctx: MutationCtx, to: string, body: string) {
  await ctx.scheduler.runAfter(0, internal.whatsapp.sendText, { to, body });
}

/** Conversation metadata; keeps unknown keys, a non-object reads as `{}`. */
const conversationMetadata = z
  .looseObject({
    lastAutoReplyAt: z.number().optional().catch(undefined),
  })
  .catch({});

/** One canned reply per 24 h per conversation, tracked in its metadata. */
async function maybeSendCannedReply(ctx: MutationCtx, from: string) {
  const conversation = await whatsapp.getConversation(ctx, from);

  if (!conversation) {
    return;
  }

  const metadata = conversationMetadata.parse(conversation.metadata);
  const lastAutoReplyAt = metadata.lastAutoReplyAt ?? 0;

  if (Date.now() - lastAutoReplyAt < DAY_MS) {
    return;
  }

  await whatsapp.updateConversationMetadata(ctx, conversation._id, {
    ...metadata,
    lastAutoReplyAt: Date.now(),
  });
  await scheduleReply(ctx, from, CANNED_REPLY);
}

/**
 * Run one inbound sub-mutation. A throw rolls back only that
 * sub-transaction (nothing half-applied) and returns `null`, so the handler
 * still commits its marker and replies.
 */
async function runGuarded<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    console.error("WhatsApp inbound action failed", error);
    return null;
  }
}

export const onInboundMessage = zInternalMutation({
  args: z.object({
    messageId: z.string(),
  }),
  handler: async (ctx, args) => {
    const message = await whatsapp.getMessage(ctx, args.messageId);

    if (message?.direction !== "inbound") {
      return;
    }

    // The component inserts a new `messages` row per webhook delivery, so a
    // Meta retry arrives with a new component id. Dedup on Meta's message id:
    // first insert wins, later invocations return before acting.
    const dedupKey = message.waMessageId ?? args.messageId;
    const seen = await ctx.db
      .query("whatsappInboundMessages")
      .withIndex("by_messageId", (q) => q.eq("messageId", dedupKey))
      .unique();

    if (seen) {
      return;
    }

    await ctx.db.insert("whatsappInboundMessages", { messageId: dedupKey });

    // oxlint-disable-next-line typescript/no-unsafe-argument -- the component stores `payload` as `v.any()`; getWhatsAppReplyId parses it with zod
    const replyId = getWhatsAppReplyId(message.payload);
    const action = replyId ? parseWhatsAppActionId(replyId) : null;

    if (!action) {
      await maybeSendCannedReply(ctx, message.from);
      return;
    }

    if (action.type === "appointment-reschedule") {
      const appointmentId = ctx.db.normalizeId(
        "appointments",
        action.appointmentId,
      );

      if (!appointmentId) {
        return;
      }

      // A throw (e.g. the proposed slot now overlaps) reads as inactive.
      const applied =
        (await runGuarded<boolean>(() =>
          ctx.runMutation(
            internal.appointments.answerRescheduleRequestFromWhatsApp,
            {
              appointmentId,
              accepted: action.action === "accept",
              answeredBy: action.role,
              proposedAt: action.proposedAt,
              senderPhone: message.from,
            },
          ),
        )) ?? false;

      await scheduleReply(
        ctx,
        message.from,
        applied
          ? action.action === "accept"
            ? "Listo. Tu cita quedó reprogramada."
            : "Listo. Rechazaste el cambio y la cita quedó cancelada."
          : "Esta solicitud ya no está activa. Revisa el estado de tu cita en panabarbero.com.",
      );
      return;
    }

    if (action.type === "inventory-ack") {
      const levelId = ctx.db.normalizeId("inventoryLevels", action.levelId);

      if (!levelId) {
        return;
      }

      const acked =
        (await runGuarded<boolean>(() =>
          ctx.runMutation(internal.inventoryAlerts.ackLowStockFromWhatsApp, {
            levelId,
            alertedAt: action.alertedAt,
            senderPhone: message.from,
          }),
        )) ?? false;

      await scheduleReply(
        ctx,
        message.from,
        acked
          ? "Listo. No enviaremos más alertas de este producto hasta que el stock se recupere."
          : "Esta alerta ya no está activa.",
      );
      return;
    }

    if (action.type === "appointment-omw") {
      const appointmentId = ctx.db.normalizeId(
        "appointments",
        action.appointmentId,
      );

      if (!appointmentId) {
        return;
      }

      const result =
        (await runGuarded<"notified" | "already-notified" | "inactive">(() =>
          ctx.runMutation(internal.appointments.markOnMyWayFromWhatsApp, {
            appointmentId,
            date: action.date,
            senderPhone: message.from,
          }),
        )) ?? "error";

      await scheduleReply(
        ctx,
        message.from,
        result === "error"
          ? "No pudimos avisar a tu barbero. Inténtalo de nuevo en unos minutos."
          : result === "inactive"
            ? "Esta cita ya no está activa. Revisa el estado de tu cita en panabarbero.com."
            : "Listo. Le avisamos a tu barbero que vas en camino.",
      );
      return;
    }

    if (action.type === "appointment-closeout") {
      const appointmentId = ctx.db.normalizeId(
        "appointments",
        action.appointmentId,
      );

      if (!appointmentId) {
        return;
      }

      // A throw (e.g. stock consumption failed) maps to "error" — the barber
      // can still close the cita from the agenda.
      const result =
        (await runGuarded<"applied" | "needs-final-price" | "inactive">(() =>
          ctx.runMutation(
            internal.appointments.closeoutAppointmentFromWhatsApp,
            {
              appointmentId,
              status: action.action,
              date: action.date,
              senderPhone: message.from,
            },
          ),
        )) ?? "error";

      await scheduleReply(
        ctx,
        message.from,
        result === "applied"
          ? action.action === "completed"
            ? "Listo. La cita quedó marcada como completada."
            : "Listo. La cita quedó marcada como no asistió."
          : result === "needs-final-price"
            ? "Esta cita tiene precios «desde». Registra el precio final y ciérrala desde tu agenda en panabarbero.com."
            : result === "error"
              ? "No pudimos cerrar la cita. Ciérrala desde tu agenda en panabarbero.com."
              : "Esta cita ya no está activa. Revisa tu agenda en panabarbero.com.",
      );
      return;
    }

    if (action.type === "review-invite") {
      const appointmentId = ctx.db.normalizeId(
        "appointments",
        action.appointmentId,
      );

      if (!appointmentId) {
        return;
      }

      const reviewable: boolean = await ctx.runQuery(
        internal.reviews.canReviewFromWhatsApp,
        { appointmentId, senderPhone: message.from },
      );

      if (!reviewable) {
        await scheduleReply(
          ctx,
          message.from,
          "Esta visita ya no se puede calificar por aquí. Puedes hacerlo desde tu perfil en panabarbero.com.",
        );
        return;
      }

      const appointment = await ctx.db.get(appointmentId);
      const barbershop = appointment
        ? await ctx.db.get(appointment.barbershopId)
        : null;

      await ctx.scheduler.runAfter(0, internal.whatsapp.sendRatingList, {
        to: message.from,
        appointmentId,
        barbershopName: barbershop?.name ?? "la barbería",
      });
      return;
    }

    if (action.type === "review-rate") {
      const appointmentId = ctx.db.normalizeId(
        "appointments",
        action.appointmentId,
      );

      if (!appointmentId) {
        return;
      }

      const created =
        (await runGuarded<boolean>(() =>
          ctx.runMutation(internal.reviews.createFromWhatsApp, {
            appointmentId,
            rating: action.rating,
            senderPhone: message.from,
          }),
        )) ?? false;

      await scheduleReply(
        ctx,
        message.from,
        created
          ? "Gracias por calificar tu visita."
          : "Esta visita ya no se puede calificar por aquí. Puedes hacerlo desde tu perfil en panabarbero.com.",
      );
    }
  },
});

/**
 * Delete processed-markers older than 30 days, oldest first. Bounded per run;
 * a full batch schedules the next one.
 */
export const purgeInboundMarkers = zInternalMutation({
  args: z.object({}),
  handler: async (ctx) => {
    const cutoff = Date.now() - INBOUND_MARKER_TTL_MS;
    const stale = await ctx.db
      .query("whatsappInboundMessages")
      .withIndex("by_creation_time", (q) => q.lt("_creationTime", cutoff))
      .take(INBOUND_MARKER_PURGE_BATCH);

    await Promise.all(stale.map((row) => ctx.db.delete(row._id)));

    if (stale.length === INBOUND_MARKER_PURGE_BATCH) {
      await ctx.scheduler.runAfter(
        0,
        internal.whatsapp.purgeInboundMarkers,
        {},
      );
    }
  },
});

export const syncTemplates = zInternalAction({
  args: {},
  handler: async (ctx) => {
    await whatsapp.syncTemplates(ctx);
  },
});

export const listApprovedTemplates = zInternalQuery({
  args: {},
  handler: async (ctx) => {
    return await whatsapp.getTemplates(ctx, "APPROVED");
  },
});
