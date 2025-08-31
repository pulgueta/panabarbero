import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { barbers } from "@panabarbero/db/schema";
import type { Barber } from "@panabarbero/db/schema/zod";
import { barberSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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
    .returning({ id: barbers.uuid });

  await setCacheFromKey(`barbers:${created.id}`, created);

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getBarbers: ApiHandler<GetBarbersRoute> = async (c) => {
  let barbers: Barber[] | undefined;

  const cachedBarbers = await getCacheFromKey("barbers", barberSchema.array());

  if (cachedBarbers) {
    barbers = cachedBarbers;
  } else {
    barbers = await db.query.barbers.findMany({
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!barbers || barbers.length === 0) {
    return c.json({ message: "Barbers not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey("barbers", barbers);

  return c.json(barbers, api.STATUS_CODES.OK);
};

export const getBarber: ApiHandler<GetBarberRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let barber: Barber | undefined;

  const cachedBarber = await getCacheFromKey(`barbers:${uuid}`, barberSchema);

  if (cachedBarber) {
    barber = cachedBarber;
  } else {
    barber = await db.query.barbers.findFirst({
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!barber) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(barber, api.STATUS_CODES.OK);
};

export const updateBarber: ApiHandler<UpdateBarberRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let barber: Barber | undefined;

  const cachedBarber = await getCacheFromKey(`barbers:${uuid}`, barberSchema);

  if (cachedBarber) {
    barber = cachedBarber;
  } else {
    barber = await db.query.barbers.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!barber) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(barbers)
    .set(json)
    .where(eq(barbers.uuid, uuid))
    .returning({
      userId: barbers.userId,
      memberId: barbers.memberId,
      barbershopId: barbers.barbershopId,
    });

  await setCacheFromKey(`barbers:${uuid}`, updated);

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteBarber: ApiHandler<DeleteBarberRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  let barber: Barber | undefined;

  const cachedBarber = await getCacheFromKey(`barbers:${uuid}`, barberSchema);

  if (cachedBarber) {
    barber = cachedBarber;
  } else {
    barber = await db.query.barbers.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!barber) {
    return c.json({ message: "Barber not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  await Promise.all([
    db.delete(barbers).where(eq(barbers.uuid, uuid)).returning(),
    deleteCacheFromKey(`barbers:${uuid}`),
  ]);

  return c.json({ message: "Barber deleted" }, api.STATUS_CODES.OK);
};
