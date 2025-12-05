/** biome-ignore-all lint/style/noNonNullAssertion: is always provided */

import type { SearchEntry, SearchResult } from "@convex-dev/rag";
import { errorMessages } from "@panabarbero/constants";
import type { EmbeddingModelUsage } from "ai";
import type { Value } from "convex/values";
import { ConvexError, v } from "convex/values";
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
    const barbershop = await ctx.db.get(args.service.barbershopId);

    if (barbershop && barbershop.isActive === false) {
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", args.service.barbershopId),
        )
        .first();

      if (!existingService) {
        await ctx.db.patch(args.service.barbershopId, {
          isActive: true,
        });
      }
    }

    const serviceId = await ctx.db.insert("services", args.service);

    return serviceId;
  },
});

export const createService = mutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user?.userId) {
      throw new ConvexError(errorMessages.unauthorized);
    }

    const { service } = args;

    const barbershop = await ctx.db.get(service.barbershopId);

    if (!barbershop?.isActive) {
      const existingService = await ctx.db
        .query("services")
        .withIndex("by_barbershopId", (q) =>
          q.eq("barbershopId", service.barbershopId),
        )
        .first();

      if (!existingService) {
        await ctx.db.patch(service.barbershopId, {
          isActive: true,
        });
      }
    }

    await ctx.scheduler.runAfter(0, internal.rag.addToRAG, {
      namespace: "services",
      text: service.name,
      userId: user.userId,
    });

    const serviceId = await ctx.db.insert("services", service);

    return serviceId;
  },
});

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

export const getServiceById = query({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.serviceId);
  },
});

export const getServicesByIds = query({
  args: {
    serviceIds: v.array(v.id("services")),
  },
  handler: async (ctx, args) => {
    return await Promise.all(
      args.serviceIds.map(async (serviceId) => await ctx.db.get(serviceId)),
    );
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
        q.eq("barbershopId", args.barbershopId!),
      )
      .collect();

    return services;
  },
});

export const updateService = mutation({
  args: {
    service: v.object({
      name: v.string(),
      price: v.number(),
      duration: v.number(),
      barbershopId: v.id("barbershops"),
    }),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { service, serviceId } = args;

    await ctx.db.patch(serviceId, {
      ...service,
      uuid: crypto.randomUUID(),
    });
  },
});

export const deleteService = mutation({
  args: {
    barbershopId: v.id("barbershops"),
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);

    if (!user) {
      throw new Error("User not authenticated", {
        cause: user,
      });
    }

    const { serviceId, barbershopId } = args;

    const fromBarbershop = await ctx.db
      .query("barbershops")
      .withIndex("by_id", (q) => q.eq("_id", barbershopId))
      .unique();

    if (fromBarbershop?.ownerId !== user.userId) {
      throw new Error("User not authorized", {
        cause: user.userId,
      });
    }

    await ctx.db.delete(serviceId);
  },
});
