import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { services } from "@panabarbero/db/schema";
import type { Service } from "@panabarbero/db/schema/zod";
import { serviceSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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
  let services: Service[] | undefined;

  const cachedServices = await getCacheFromKey(
    "services",
    serviceSchema.array(),
  );

  if (cachedServices) {
    services = cachedServices;
  } else {
    services = await db.query.services.findMany({
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!services || services.length === 0) {
    return c.json(
      { message: "Services not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey("services", services);

  return c.json(services, api.STATUS_CODES.OK);
};

export const getService: ApiHandler<GetServiceRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let service: Service | undefined;

  const cachedService = await getCacheFromKey(
    `services:${uuid}`,
    serviceSchema,
  );

  if (cachedService) {
    service = cachedService;
  } else {
    service = await db.query.services.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!service) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey(`services:${uuid}`, service);

  return c.json(service, api.STATUS_CODES.OK);
};

export const updateService: ApiHandler<UpdateServiceRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let service: Service | undefined;

  const cachedService = await getCacheFromKey(
    `services:${uuid}`,
    serviceSchema,
  );

  if (cachedService) {
    service = cachedService;
  } else {
    service = await db.query.services.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }
  if (!service) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(services)
    .set(json)
    .where(eq(services.uuid, uuid))
    .returning();

  await setCacheFromKey(`services:${uuid}`, updated);

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteService: ApiHandler<DeleteServiceRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  let service: Service | undefined;

  const cachedService = await getCacheFromKey(
    `services:${uuid}`,
    serviceSchema,
  );

  if (cachedService) {
    service = cachedService;
  } else {
    service = await db.query.services.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }
  if (!service) {
    return c.json({ message: "Service not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await Promise.all([
    db.delete(services).where(eq(services.uuid, uuid)).returning(),
    deleteCacheFromKey(`services:${uuid}`),
  ]);

  return c.json({ message: "Service deleted" }, api.STATUS_CODES.OK);
};
