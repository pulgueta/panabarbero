import { openai } from "@ai-sdk/openai";
import { RAG } from "@convex-dev/rag";
import { v } from "convex/values";
import { components } from "./_generated/api";
import { internalAction } from "./_generated/server";

export const rag = new RAG(components.rag, {
  textEmbeddingModel: openai.embedding("text-embedding-3-small"),
  embeddingDimension: 1536,
});

export const namespace = v.union(
  v.literal("services"),
  v.literal("barbershops"),
);

export const addToRAG = internalAction({
  args: {
    userId: v.optional(v.string()),
    text: v.string(),
    namespace,
  },
  handler: async (ctx, args) => {
    await rag.add(ctx, {
      namespace: args.userId
        ? `${args.namespace}-${args.userId}`
        : args.namespace,
      text: args.text,
      key: args.text.toLowerCase(),
    });
  },
});

export const searchRAG = internalAction({
  args: {
    query: v.string(),
    namespace,
    userId: v.optional(v.string()),
    threshold: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await rag.search(ctx, {
      namespace: args.userId
        ? `${args.namespace}-${args.userId}`
        : args.namespace,
      query: args.query,
      limit: 10,
      vectorScoreThreshold: args.threshold ?? 0.5,
    });
  },
});
