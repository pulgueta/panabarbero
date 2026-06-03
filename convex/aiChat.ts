import {
  createThread,
  listUIMessages,
  saveMessage,
  syncStreams,
  vStreamArgs,
} from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";
import { ConvexError } from "convex/values";
import { convexToZod } from "convex-helpers/server/zod4";
import { z } from "zod";

import { zAction, zInternalAction, zMutation, zQuery } from ".";
import { api, components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { buildPanaSystemPrompt, panaAgent } from "./aiAgent";
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
): Promise<void> {
  const thread = await ctx.runQuery(components.agent.threads.getThread, {
    threadId,
  });

  if (!thread) throw new ConvexError("Esta conversación no existe.");
  if (thread.userId !== callerId)
    throw new ConvexError("No tienes acceso a esta conversación.");
}

export const createNewThread = zMutation({
  args: z.object({
    userId: z.string().optional(),
    title: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const callerId = await resolveCallerId(ctx, args.userId);

    const threadId = await createThread(ctx, components.agent, {
      userId: callerId,
      title: args.title ?? "Conversación con Pana",
    });

    return { threadId };
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
    const [profile, management] = isAnon
      ? [null, null]
      : await Promise.all([
          ctx.runQuery(internal.aiAgentHelpers.getProfileForUserId, {
            userId: callerId,
          }),
          ctx.runQuery(internal.aiAgentHelpers.getPanaEntitlement, {
            userId: callerId,
          }),
        ]);

    const system = buildPanaSystemPrompt({
      profile,
      isAnon,
      nowMs: Date.now(),
      management,
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
