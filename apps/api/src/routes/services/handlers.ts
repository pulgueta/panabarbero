import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { services } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreateServiceRoute,
  DeleteServiceRoute,
  GetServiceRoute,
  GetServicesRoute,
  UpdateServiceRoute,
} from "./routes";

export const createService: ApiHandler<CreateServiceRoute> = async (c) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(services)
    .values(json)
    .returning({ id: services.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getServices: ApiHandler<GetServicesRoute> = async (c) => {
  const list = await db.query.services.findMany();

  if (!list || list.length === 0) {
    return c.json(
      { message: "Services not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getService: ApiHandler<GetServiceRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const service = await db.query.services.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!service) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(service, api.STATUS_CODES.OK);
};

export const updateService: ApiHandler<UpdateServiceRoute> = async (c) => {
  const { id } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.services.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(services)
    .set(json)
    .where(eq(services.id, id))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteService: ApiHandler<DeleteServiceRoute> = async (c) => {
  const { id } = c.req.valid("query");

  const existing = await db.query.services.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [deleted] = await db
    .delete(services)
    .where(eq(services.id, id))
    .returning();

  return c.json(deleted, api.STATUS_CODES.OK);
};
