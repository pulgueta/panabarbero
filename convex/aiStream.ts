"use node";

import { gateway, generateText } from "ai";
import { z } from "zod";

import { zInternalAction } from ".";
import { components, internal } from "./_generated/api";
import { buildPanaSystemPrompt, PANA_MODEL_ID, panaAgent } from "./aiAgent";
import { trackException } from "./analytics";
import { aiTelemetry } from "./tracing";

// Node runtime on purpose: the PostHog OTel exporter (convex/tracing.ts) needs
// Node globals (`performance`) that the default Convex isolate doesn't provide.

const ANON_PREFIX = "anon:";

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
    callerId: z.string().optional(),
  }),
  handler: async (ctx, { threadId, prompt, callerId }) => {
    let title = "Conversación con Pana";

    try {
      const { text } = await generateText({
        model: gateway(PANA_MODEL_ID),
        prompt: `Eres quien titula las conversaciones de un chat de barberías en Colombia. A partir del primer mensaje del usuario, escribe un título corto y claro de 3 a 6 palabras en español que resuma el tema. Sin comillas, sin punto final y sin emojis.

Mensaje del usuario:
${prompt}

Título:`,
        experimental_telemetry: aiTelemetry({
          spanName: "pana.thread-title",
          distinctId: callerId,
          traceId: threadId,
        }),
      });

      const cleaned = text
        .trim()
        .replace(/^["'«»\s]+|["'«».\s]+$/g, "")
        .trim();

      if (cleaned) title = cleaned.slice(0, 60);
    } catch (e) {
      trackException(ctx, e, `${threadId}:${callerId}`);
    }

    await ctx.runMutation(components.agent.threads.updateThread, {
      threadId,
      patch: { title },
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
      {
        promptMessageId,
        system,
        experimental_telemetry: aiTelemetry({
          spanName: "pana.chat",
          distinctId: callerId,
          traceId: threadId,
        }),
      },
      { saveStreamDeltas: { chunking: "word", throttleMs: 100 } },
    );
    await result.consumeStream();
  },
});
