import { RAG } from "@convex-dev/rag";
import { gateway } from "ai";
import { z } from "zod";

import { zInternalAction, zInternalQuery } from ".";
import { components, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";
import { getLimitsForProductKey } from "./plans";
import { polar } from "./polar";

/**
 * Pana's retrieval-augmented memory (paid plans only). Two kinds of knowledge,
 * each in its own namespace so they never bleed across users or shops:
 * - `mem:<userId>`  — durable facts Pana learned from a paid user's past chats
 *   (the "constant learning" memory). Gated by `panaMemory` (pro + premium).
 * - `shop:<barbershopId>` — the barbershop's own knowledge base (services,
 *   hours, contact). Gated by `panaKnowledgeBase` (premium only).
 *
 * Embeddings run through the Vercel AI Gateway in the default Convex isolate —
 * this file must NOT be `"use node"` (importing a node file from an isolate
 * file breaks codegen). `aiStream.ts` (node) may import from here, not vice
 * versa.
 */
export const rag = new RAG(components.rag, {
  textEmbeddingModel: gateway.embedding("openai/text-embedding-3-small"),
  embeddingDimension: 1536,
});

export const userMemoryNamespace = (userId: string) => `mem:${userId}`;
export const shopKnowledgeNamespace = (barbershopId: string) =>
  `shop:${barbershopId}`;

const MEMORY_LIMIT = 6;
const KNOWLEDGE_LIMIT = 4;
const SCORE_THRESHOLD = 0.3;

/**
 * Searches a namespace and returns the pre-formatted context string, or `""`
 * if there's nothing relevant (or the namespace doesn't exist yet). Searching
 * an empty namespace must never break a chat turn, so failures are swallowed.
 */
async function safeSearch(
  ctx: ActionCtx,
  namespace: string,
  query: string,
  limit: number,
): Promise<string> {
  try {
    const { text } = await rag.search(ctx, {
      namespace,
      query,
      limit,
      vectorScoreThreshold: SCORE_THRESHOLD,
    });
    return text.trim();
  } catch {
    return "";
  }
}

/**
 * Builds the RAG context block injected into the system prompt for a single
 * generation. Returns `""` when the caller's plan unlocks no memory or nothing
 * relevant was found. Called from the (node) streaming action.
 */
export async function retrievePanaContext(
  ctx: ActionCtx,
  args: {
    userId: string;
    query: string;
    barbershopId: string | null;
    memory: boolean;
    knowledgeBase: boolean;
  },
): Promise<string> {
  const query = args.query.trim();
  if (!query || (!args.memory && !args.knowledgeBase)) return "";

  const [memory, knowledge] = await Promise.all([
    args.memory
      ? safeSearch(ctx, userMemoryNamespace(args.userId), query, MEMORY_LIMIT)
      : Promise.resolve(""),
    args.knowledgeBase && args.barbershopId
      ? safeSearch(
          ctx,
          shopKnowledgeNamespace(args.barbershopId),
          query,
          KNOWLEDGE_LIMIT,
        )
      : Promise.resolve(""),
  ]);

  const sections: string[] = [];
  if (memory) {
    sections.push(
      `Lo que recuerdas de este usuario (de conversaciones pasadas; úsalo solo si encaja, no lo recites):\n${memory}`,
    );
  }
  if (knowledge) {
    sections.push(
      `Base de conocimiento de su barbería (datos vigentes para responder con precisión):\n${knowledge}`,
    );
  }
  if (sections.length === 0) return "";

  return `\n\n# Memoria y conocimiento (RAG)\n${sections.join("\n\n")}`;
}

/** Shop data used to (re)build the `shop:<id>` knowledge base entry. */
export const getShopKnowledgeData = zInternalQuery({
  args: z.object({ barbershopId: z.string() }),
  handler: async (ctx, args) => {
    const barbershopId = args.barbershopId as Id<"barbershops">;
    const shop = await ctx.db.get(barbershopId);
    if (!shop) return null;

    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) => q.eq("barbershopId", barbershopId))
      .collect();

    const subscription = await polar.getCurrentSubscription(ctx, {
      userId: shop.ownerId,
    });
    const limits = getLimitsForProductKey(subscription?.productKey);

    return {
      isPremium: limits.panaKnowledgeBase,
      name: shop.name,
      city: shop.city,
      state: shop.state,
      description: shop.description ?? "",
      contactPhone: shop.contactPhone ?? "",
      availability: shop.availability.map((a) => ({
        day: a.weekDay.day,
        isOpen: a.weekDay.isActive,
        openAt: a.openAt,
        closeAt: a.closeAt,
      })),
      services: services.map((s) => ({
        name: s.name,
        price: s.price,
        durationMinutes: s.duration,
      })),
    };
  },
});

const DAY_ES: Record<string, string> = {
  monday: "lunes",
  tuesday: "martes",
  wednesday: "miércoles",
  thursday: "jueves",
  friday: "viernes",
  saturday: "sábado",
  sunday: "domingo",
};

/**
 * (Re)builds the knowledge-base entry for one barbershop. Idempotent: keyed by
 * the barbershop id so re-running replaces the prior entry. No-op unless the
 * shop's plan is premium (`panaKnowledgeBase`). Scheduled after service edits
 * and runnable as a backfill.
 */
export const reindexShopKnowledge = zInternalAction({
  args: z.object({ barbershopId: z.string() }),
  handler: async (ctx, args) => {
    const data = await ctx.runQuery(internal.aiRag.getShopKnowledgeData, {
      barbershopId: args.barbershopId,
    });

    if (!data || !data.isPremium) return;

    const hours = data.availability
      .map((a) =>
        a.isOpen
          ? `${DAY_ES[a.day] ?? a.day}: ${a.openAt}–${a.closeAt}`
          : `${DAY_ES[a.day] ?? a.day}: cerrado`,
      )
      .join("; ");

    const services = data.services.length
      ? data.services
          .map(
            (s) =>
              `${s.name}: $${s.price.toLocaleString("es-CO")} (${s.durationMinutes} min)`,
          )
          .join("; ")
      : "Sin servicios registrados todavía.";

    const text = [
      `Barbería: ${data.name} (${data.city}, ${data.state}).`,
      data.description ? `Descripción: ${data.description}.` : "",
      data.contactPhone ? `Contacto: ${data.contactPhone}.` : "",
      `Horario semanal: ${hours}.`,
      `Servicios: ${services}.`,
    ]
      .filter(Boolean)
      .join("\n");

    await rag.add(ctx, {
      namespace: shopKnowledgeNamespace(args.barbershopId),
      key: `shop:${args.barbershopId}`,
      title: data.name,
      text,
    });
  },
});

/** Ids of every active barbershop — drives the knowledge-base backfill. */
export const listActiveBarbershopIds = zInternalQuery({
  args: z.object({}),
  handler: async (ctx) => {
    const shops = await ctx.db
      .query("barbershops")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect();
    return shops.map((s) => s._id as string);
  },
});

/**
 * One-shot backfill: (re)indexes the knowledge base for every active shop.
 * Each `reindexShopKnowledge` no-ops unless that shop is on the premium plan,
 * so this is safe to run anytime. Trigger with
 * `convex run aiRag:reindexAllShopKnowledge`.
 */
export const reindexAllShopKnowledge = zInternalAction({
  args: z.object({}),
  handler: async (ctx): Promise<{ scheduled: number }> => {
    const ids: string[] = await ctx.runQuery(
      internal.aiRag.listActiveBarbershopIds,
      {},
    );
    for (const barbershopId of ids) {
      await ctx.scheduler.runAfter(0, internal.aiRag.reindexShopKnowledge, {
        barbershopId,
      });
    }
    return { scheduled: ids.length };
  },
});
