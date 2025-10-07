import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { tables } from "./tables";

export const createService = mutation({
  args: {
    service: v.object({
      ...tables.services,
    }),
  },
  handler: async (ctx, args) => {
    const { service } = args;

    const serviceId = await ctx.db.insert("services", service);

    return serviceId;
  },
});

export const getServices = query({
  handler: async (ctx) => {
    const services = await ctx.db.query("services").collect();

    return services;
  },
});

export const getServiceByUuid = query({
  args: {
    uuid: v.string(),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db
      .query("services")
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
    const { service, serviceId } = args;

    const updatedService = await ctx.db.patch(serviceId, service);

    return updatedService;
  },
});

export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const { serviceId } = args;

    await ctx.db.delete(serviceId);
  },
});
