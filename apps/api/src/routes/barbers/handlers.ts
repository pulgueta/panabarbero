import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { barbers } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreateBarberRoute,
  DeleteBarberRoute,
  GetBarberRoute,
  GetBarbersRoute,
  UpdateBarberRoute,
} from "./routes";

export const createBarber: ApiHandler<CreateBarberRoute> = async (c) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(barbers)
    .values(json)
    .returning({ id: barbers.id });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getBarbers: ApiHandler<GetBarbersRoute> = async (c) => {
  const list = await db.query.barbers.findMany();

  if (!list || list.length === 0) {
    return c.json({ message: "Barbers not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getBarber: ApiHandler<GetBarberRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const barber = await db.query.barbers.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });

  if (!barber) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(barber, api.STATUS_CODES.OK);
};

export const updateBarber: ApiHandler<UpdateBarberRoute> = async (c) => {
  const { id } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.barbers.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(barbers)
    .set(json)
    .where(eq(barbers.id, id))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteBarber: ApiHandler<DeleteBarberRoute> = async (c) => {
  const { id } = c.req.valid("query");

  const existing = await db.query.barbers.findFirst({
    where: (t, { eq }) => eq(t.id, id),
  });
  if (!existing) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [deleted] = await db
    .delete(barbers)
    .where(eq(barbers.id, id))
    .returning();

  return c.json(deleted, api.STATUS_CODES.OK);
};
