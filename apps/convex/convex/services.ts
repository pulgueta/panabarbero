import { openai } from "@ai-sdk/openai";
import { embed } from "ai";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

export const genreateEmbedding = internalMutation({
  args: {
    text: v.string(),
  },
  handler: async (_, args) => {
    const ai = openai.textEmbedding("text-embedding-3-small");

    const { embedding } = await embed({
      model: ai,
      value: args.text,
    });

    return embedding;
  },
});

type ServiceResult = {
  _id: Id<"services">;
  score: number;
  name: string;
};

export const searchServices = action({
  args: {
    service: v.string(),
  },
  handler: async (ctx, args): Promise<ServiceResult[]> => {
    const embedding = await ctx.runMutation(
      internal.services.genreateEmbedding,
      { text: args.service },
    );

    const vectorSearchResults = await ctx.vectorSearch(
      "services",
      "name_vector_idx",
      {
        vector: embedding,
        limit: 10,
      },
    );

    const vectorResults = await ctx.runQuery(
      internal.services.getServicesFromVectorSearchResults,
      {
        results: vectorSearchResults,
      },
    );

    return vectorResults;
  },
});

export const createService = mutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { service } = args;

    const embeddedName = await ctx.runMutation(
      internal.services.genreateEmbedding,
      { text: service.name },
    );

    await ctx.db.insert("services", {
      ...service,
      nameVector: embeddedName,
    });
  },
});

// export const getServices = query({
//   handler: async (ctx) => {
//     const services = await ctx.db.query("services").collect();

//     return services;
//   },
// });

export const getServiceByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
      .withIndex("by_uuid")
      .filter(({ eq, field }) => eq(field("uuid"), args.uuid))
      .unique();

    return service;
  },
});

export const getServicesByBarbershopId = query({
  args: {
    barbershopId: v.id("barbershops"),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId")
      .filter(({ eq, field }) => eq(field("barbershopId"), args.barbershopId))
      .collect();

    return services;
  },
});

export const updateService = mutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { service, serviceId } = args;

    const embeddedName = await ctx.runMutation(
      internal.services.genreateEmbedding,
      { text: service.name },
    );

    await ctx.db.patch(serviceId, {
      ...service,
      nameVector: embeddedName,
    });
  },
});

export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }
    const { serviceId } = args;

    await ctx.db.delete(serviceId);
  },
});

export const getServicesFromVectorSearchResults = internalQuery({
  args: {
    results: v.array(
      v.object({
        _id: v.id("services"),
        _score: v.number(),
      }),
    ),
  },
  handler: async (ctx, { results }) => {
    const services = await Promise.all(
      results.map(async ({ _id, _score }) => {
        const service = await ctx.db.get(_id);

        if (!service) return null;

        return {
          _id,
          score: _score,
          name: service.name,
        };
      }),
    );

    return services.filter((s) => s != null);
  },
});
