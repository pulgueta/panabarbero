"use node";

import { gateway, generateText } from "ai";
import { z } from "zod";

import { zInternalAction } from ".";
import { components, internal } from "./_generated/api";
import { buildPanaSystemPrompt, PANA_MODEL_ID, panaAgent } from "./aiAgent";
import { rag, retrievePanaContext, userMemoryNamespace } from "./aiRag";
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
    /** The user's latest message text — RAG query + distillation source. */
    prompt: z.string().optional(),
  }),
  handler: async (ctx, { threadId, promptMessageId, callerId, prompt }) => {
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

    // Paid plans only: pull the caller's remembered facts (and, on premium,
    // their shop's knowledge base) and append them to the system prompt.
    const ragContext =
      management && prompt
        ? await retrievePanaContext(ctx, {
            userId: callerId,
            query: prompt,
            barbershopId: management.barbershopId,
            memory: management.panaMemory,
            knowledgeBase: management.panaKnowledgeBase,
          })
        : "";

    const system =
      buildPanaSystemPrompt({
        profile,
        isAnon,
        nowMs: Date.now(),
        management,
        member,
      }) + ragContext;

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

    // Learn from the exchange (paid plans). Best-effort, in the background.
    if (management?.panaMemory && prompt) {
      let assistantText = "";
      try {
        assistantText = await result.text;
      } catch {
        assistantText = "";
      }
      if (assistantText.trim()) {
        await ctx.scheduler.runAfter(
          0,
          internal.aiStream.distillAndRememberTurn,
          { userId: callerId, userText: prompt, assistantText },
        );
      }
    }
  },
});

/**
 * Extracts 0–3 durable, user-specific facts from one chat exchange and stores
 * them in the user's RAG memory namespace so future chats can recall them.
 * Runs after the response streams (paid plans only). Best-effort: any failure
 * is swallowed so it never affects the conversation. Node runtime because it
 * calls the gateway model (like `generateThreadTitle`).
 */
export const distillAndRememberTurn = zInternalAction({
  args: z.object({
    userId: z.string(),
    userText: z.string(),
    assistantText: z.string(),
  }),
  handler: async (ctx, { userId, userText, assistantText }) => {
    try {
      const { text } = await generateText({
        model: gateway(PANA_MODEL_ID),
        prompt: `Eres la memoria de "Pana", asistente de una app de barberías. Del siguiente intercambio, extrae HECHOS DURADEROS y útiles sobre el usuario que valga la pena recordar para futuras conversaciones: sus preferencias (barbero, servicio u horario habitual), su barbería y rol, decisiones o ajustes que hizo. NO incluyas datos efímeros (una fecha puntual ya resuelta), ni cosas obvias, ni información sensible (teléfonos, correos). Si no hay nada que valga la pena, responde EXACTAMENTE "NADA".

Devuelve de 0 a 3 hechos, uno por línea, en español, en tercera persona, concisos. Sin viñetas ni numeración.

Usuario: ${userText}
Pana: ${assistantText}

Hechos:`,
      });

      const cleaned = text.trim();
      if (!cleaned || cleaned.toUpperCase().startsWith("NADA")) return;

      const facts = cleaned
        .split("\n")
        .map((l) => l.replace(/^[-•*\d.)\s]+/, "").trim())
        .filter((l) => l.length > 3)
        .slice(0, 3);

      for (const fact of facts) {
        await rag.add(ctx, {
          namespace: userMemoryNamespace(userId),
          text: fact,
        });
      }
    } catch (e) {
      trackException(ctx, e, `distill:${userId}`);
    }
  },
});
