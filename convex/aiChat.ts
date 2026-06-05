import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { gateway, generateText } from "ai";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAction, zInternalAction, zMutation, zQuery } from ".";
import { api, components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { buildPanaSystemPrompt, PANA_MODEL_ID, panaAgent } from "./aiAgent";
import { resolvePanaAccessForUserId } from "./aiAgentHelpers";
import { authComponent } from "./auth";
import { rateLimiter } from "./ratelimit";

const ANON_PREFIX = "anon:";

async function resolveCallerId(
  ctx: QueryCtx | MutationCtx | ActionCtx,
  userId: string | undefined,
): Promise<string> {
  const user = await authComponent.safeGetAuthUser(ctx);

  if (user?.userId) return user.userId;

  if (userId && userId.length > 0) {
    return `${ANON_PREFIX}${userId}`;
  }
  throw new ConvexError("Falta el identificador de sesión. Recarga la página.");
}

async function authorizeThreadAccess(
  ctx: Parameters<typeof listUIMessages>[0],
  threadId: string,
  callerId: string,
) {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });

  if (!thread) throw new ConvexError("Esta conversación no existe.");
  if (thread.userId !== callerId)
    throw new ConvexError("No tienes acceso a esta conversación.");

  return thread;
}

/**
 * Starts a new conversation and sends its first message in a single round-trip,
 * then schedules the AI response and the title generation. Combining the two
 * mutations the client used to make (create + send) removes a network hop, so
 * the first message lands instantly when we navigate to `/chat/$threadId`.
 *
 * The thread is created without a title on purpose — `generateThreadTitle`
 * fills it in from this first message, letting the sidebar show a skeleton in
 * the meantime.
 */
export const createThreadAndSend = zMutation({
  args: z.object({
    prompt: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    await rateLimiter.limit(
      ctx,
      isAnon ? "aiSendMessageAnon" : "aiSendMessage",
      { key: callerId, throws: true },
    );

    const threadId = await createThread(ctx, components.agent, {
      userId: callerId,
    });

    const { messageId } = await panaAgent.saveMessage(ctx, {
      threadId,
      userId: callerId,
      prompt: args.prompt,
      skipEmbeddings: true,
    });

    await Promise.all([
      ctx.scheduler.runAfter(0, internal.aiChat.streamResponse, {
        threadId,
        promptMessageId: messageId,
        callerId,
      }),
      ctx.scheduler.runAfter(0, internal.aiChat.generateThreadTitle, {
        threadId,
        prompt: args.prompt,
      }),
    ]);

    return { threadId };
  },
});

/**
 * Generates a short Spanish title for a thread from its first message using
 * DeepSeek v4 flash, then patches the thread. Runs in the background right
 * after the thread is created. On any failure it writes a safe fallback title
 * so the sidebar never gets stuck on a loading skeleton.
 */
export const generateThreadTitle = zInternalAction({
  args: z.object({
    threadId: z.string(),
    prompt: z.string(),
  }),
  handler: async (ctx, { threadId, prompt }) => {
    let title = "Conversación con Pana";

    try {
      const { text } = await generateText({
        model: gateway(PANA_MODEL_ID),
        prompt: `Eres quien titula las conversaciones de un chat de barberías en Colombia. A partir del primer mensaje del usuario, escribe un título corto y claro de 3 a 6 palabras en español que resuma el tema. Sin comillas, sin punto final y sin emojis.

Mensaje del usuario:
${prompt}

Título:`,
      });

      const cleaned = text
        .trim()
        .replace(/^["'«»\s]+|["'«».\s]+$/g, "")
        .trim();

      if (cleaned) title = cleaned.slice(0, 60);
    } catch {
      // Keep the fallback title — better a generic name than a stuck skeleton.
    }

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { title },
    });
  },
});

export const listMyThreads = zQuery({
  args: z.object({
    userId: z.string().optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId).catch(() => null);

    if (!callerId) {
      return { page: [], isDone: true, continueCursor: "" };
    }

    return await ctx.runQuery(components.agent.threads.listThreadsByUserId, {
      userId: callerId,
      paginationOpts: args.paginationOpts,
      order: "desc",
    });
  },
});

export const listMessages = zQuery({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
    paginationOpts: convexToZod(paginationOptsValidator),
    streamArgs: convexToZod(vStreamArgs),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    await authorizeThreadAccess(ctx, args.threadId, callerId);

    const [streams, paginated] = await Promise.all([
      syncStreams(ctx, components.agent, {
        threadId: args.threadId,
        streamArgs: args.streamArgs,
      }),
      listUIMessages(ctx, components.agent, {
        threadId: args.threadId,
        paginationOpts: args.paginationOpts,
      }),
    ]);

    return { ...paginated, streams };
  },
});

export const sendMessage = zMutation({
  args: z.object({
    threadId: z.string(),
    prompt: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    await Promise.all([
      authorizeThreadAccess(ctx, args.threadId, callerId),
      rateLimiter.limit(ctx, isAnon ? "aiSendMessageAnon" : "aiSendMessage", {
        key: callerId,
        throws: true,
      }),
    ]);

    const { messageId } = await panaAgent.saveMessage(ctx, {
      threadId: args.threadId,
      userId: callerId,
      prompt: args.prompt,
      skipEmbeddings: true,
    });

    await ctx.scheduler.runAfter(0, internal.aiChat.streamResponse, {
      threadId: args.threadId,
      promptMessageId: messageId,
      callerId,
    });
  },
});

export const streamResponse = zInternalAction({
  args: z.object({
    threadId: z.string(),
    promptMessageId: z.string(),
    callerId: z.string(),
  }),
  handler: async (ctx, { threadId, promptMessageId, callerId }) => {
    const isAnon = callerId.startsWith(ANON_PREFIX);
    const [profile, management, member] = isAnon
      ? [null, null, null]
      : await Promise.all([
          ctx.runQuery(internal.aiAgentHelpers.getProfileForUserId, {
            userId: callerId,
          }),
          ctx.runQuery(internal.aiAgentHelpers.getPanaEntitlement, {
            userId: callerId,
          }),
          ctx.runQuery(internal.aiAgentHelpers.getMemberForUserId, {
            userId: callerId,
          }),
        ]);

    const system = buildPanaSystemPrompt({
      profile,
      isAnon,
      nowMs: Date.now(),
      management,
      member,
    });

    const result = await panaAgent.streamText(
      ctx,
      { threadId, userId: callerId },
      { promptMessageId, system },
      { saveStreamDeltas: { chunking: "word", throttleMs: 100 } },
    );
    await result.consumeStream();
  },
});

const confirmActionArgs = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("book"),
    args: z.object({
      barbershopId: z.string(),
      serviceId: z.string(),
      barbershopMemberId: z.string(),
      date: z.number(),
      customerName: z.string(),
      contactPhone: z.string(),
      contactEmail: z.string().optional(),
      notes: z.string().optional(),
    }),
  }),
  z.object({
    action: z.literal("cancel"),
    args: z.object({
      appointmentId: z.string(),
      reason: z.string(),
    }),
  }),
  z.object({
    action: z.literal("reschedule"),
    args: z.object({
      appointmentId: z.string(),
      proposedDate: z.number(),
    }),
  }),
]);

export const confirmPendingAction = zAction({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
    pending: confirmActionArgs,
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);
    await authorizeThreadAccess(ctx, args.threadId, callerId);

    const isAnon = callerId.startsWith(ANON_PREFIX);
    let summary: string;

    switch (args.pending.action) {
      case "book": {
        const a = args.pending.args;
        await ctx.runMutation(internal.appointments.agentBook, {
          userId: callerId,
          barbershopId: a.barbershopId as Id<"barbershops">,
          serviceId: a.serviceId as Id<"services">,
          barbershopMemberId: a.barbershopMemberId as Id<"barbershopMembers">,
          date: a.date,
          customerName: a.customerName,
          contactPhone: a.contactPhone,
          contactEmail: a.contactEmail,
          notes: a.notes,
        });
        summary = "Tu cita quedó reservada. ¡Nos vemos pronto!";
        break;
      }
      case "cancel": {
        if (isAnon) {
          throw new ConvexError(
            "Necesitas iniciar sesión para cancelar citas.",
          );
        }
        const a = args.pending.args;
        await ctx.runMutation(api.appointments.cancel, {
          appointmentId: { id: a.appointmentId as Id<"appointments"> },
          cancelledByUserId: callerId,
          reason: a.reason,
          cancelledBy: "customer",
        });
        summary = "Tu cita fue cancelada.";
        break;
      }
      case "reschedule": {
        if (isAnon) {
          throw new ConvexError(
            "Necesitas iniciar sesión para reagendar citas.",
          );
        }
        const a = args.pending.args;
        await ctx.runMutation(api.appointments.requestReschedule, {
          appointmentId: { id: a.appointmentId as Id<"appointments"> },
          proposedDate: a.proposedDate,
          requestedByUserId: callerId,
        });
        summary = "Solicitud de reagendamiento enviada al barbero.";
        break;
      }
    }

    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: { role: "assistant", content: summary },
      agentName: "Pana",
    });
  },
});

export const rejectPendingAction = zAction({
  args: z.object({
    threadId: z.string(),
    userId: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);
    await authorizeThreadAccess(ctx, args.threadId, callerId);

    await saveMessage(ctx, components.agent, {
      threadId: args.threadId,
      userId: callerId,
      message: {
        role: "assistant",
        content:
          "Listo, dejo esa acción. ¿Quieres que ajuste algo o lo intentamos de otra forma?",
      },
      agentName: "Pana",
    });
  },
});

/**
 * Client-facing gate for the Pana chat. Tells the UI whether the current user
 * is a barbershop member and, if so, whether the barbershop's plan unlocks the
 * management capabilities. Customers (authenticated or anonymous) are never
 * gated — they use Pana freely. Access is derived from the barbershop owner's
 * plan, the same source the AI's system prompt uses.
 */
export const getPanaAccess = zQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      return { isShopMember: false, canManage: true, isOwner: false };
    }

    return await resolvePanaAccessForUserId(ctx, user.userId);
  },
});
