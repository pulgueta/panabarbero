import type { SearchEntry, SearchResult } from "@convex-dev/rag";
import type { EmbeddingModelUsage } from "ai";
import type { Value } from "convex/values";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, mutation, query } from "./_generated/server";
import { authComponent } from "./auth";
import { tables } from "./tables";

type ServiceResult = {
  results: SearchResult[];
  text: string;
  entries: SearchEntry<Record<string, Value>, Record<string, Value>>[];
  usage: EmbeddingModelUsage;
};

export const searchServices = action({
  args: {
    service: v.string(),
  },
  handler: async (ctx, args): Promise<ServiceResult> => {
    const user = await authComponent.getAuthUser(ctx);

    const serviceResults = await ctx.runAction(internal.rag.searchRAG, {
      namespace: "services",
      query: args.service,
      userId: user.userId ?? undefined,
    });

    return serviceResults;
  },
});

export const createServiceMutation = internalMutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("services", args.service);
  },
});

export const createService = action({
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

    await ctx.runAction(internal.rag.addToRAG, {
      namespace: "services",
      text: service.name,
      userId: user.userId ?? undefined,
    });

    await ctx.runMutation(internal.services.createServiceMutation, {
      service,
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
      .withIndex("by_uuid", (q) => q.eq("uuid", args.uuid))
      .unique();

    return service;
  },
});

export const getServicesByBarbershopId = query({
  args: {
    barbershopId: v.optional(v.id("barbershops")),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db
      .query("services")
      .withIndex("by_barbershopId", (q) =>
        // biome-ignore lint/style/noNonNullAssertion: barbershopId is always provided
        q.eq("barbershopId", args.barbershopId!),
      )
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

    await ctx.db.patch(serviceId, service);
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
