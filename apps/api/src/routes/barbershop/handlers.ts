import { auth } from "@panabarbero/auth";
import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { barbershops } from "@panabarbero/db/schema";
import { barbershopSchema } from "@panabarbero/db/schema/zod";
import { array } from "zod";

import type { ApiHandler } from "@/config/types";
import { getCacheFromKey } from "@/services/cache";
import { slugify } from "@/utils/lib";
import type {
  CreateBarbershopRoute,
  DeleteBarbershopRoute,
  GetBarbershopRoute,
  GetBarbershopsRoute,
  UpdateBarbershopRoute,
} from "./routes";

export const createBarbershop: ApiHandler<CreateBarbershopRoute> = async (
  c,
) => {
  const jsonBarbershop = c.req.valid("json");

  let slugifiedName = slugify(jsonBarbershop.name);

  const existingBarbershopSlug = await db.query.barbershops.findFirst({
    where: (table, { eq, sql, and }) =>
      and(
        eq(table.name, jsonBarbershop.name),
        eq(sql`lower(organization.slug)`, slugifiedName),
      ),
    with: {
      organization: true,
    },
  });

  if (existingBarbershopSlug?.organization.slug === slugifiedName) {
    slugifiedName = `${slugifiedName}-${crypto.randomUUID()}`;
  }

  const createdBarbershopOrganization = await auth.api.createOrganization({
    body: {
      name: jsonBarbershop.name,
      slug: slugifiedName,
      userId: jsonBarbershop.ownerId,
      logo: jsonBarbershop.logo,
    },
  });

  const [createdBarbershop] = await db
    .insert(barbershops)
    .values({
      ...jsonBarbershop,
      organizationId: createdBarbershopOrganization?.id ?? "",
    })
    .returning();

  return c.json(
    {
      id: createdBarbershop.id,
    },
    api.STATUS_CODES.CREATED,
  );
};

export const getBarbershops: ApiHandler<GetBarbershopsRoute> = async (c) => {
  const cachedBarbershops = await getCacheFromKey(
    api.CACHE_KEYS.BARBERSHOP,
    array(barbershopSchema),
  );

  if (cachedBarbershops) {
    return c.json(cachedBarbershops, api.STATUS_CODES.OK);
  }

  const barbershops = await db.query.barbershops.findMany();

  if (!barbershops) {
    return c.json(
      { message: "Barbershops not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(barbershops, api.STATUS_CODES.OK);
};

export const getBarbershop: ApiHandler<GetBarbershopRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const barbershop = await db.query.barbershops.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(barbershop, api.STATUS_CODES.OK);
};

export const updateBarbershop: ApiHandler<UpdateBarbershopRoute> = async (
  c,
) => {
  const { id } = c.req.valid("param");
  const jsonBarbershop = c.req.valid("json");

  const updatedBarbershop = await db
    .update(barbershops)
    .set(jsonBarbershop)
    .where(eq(barbershops.id, id));

  const barbershop = await db.query.barbershops.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(updatedBarbershop, api.STATUS_CODES.OK);
};

export const deleteBarbershop: ApiHandler<DeleteBarbershopRoute> = async (
  c,
) => {
  const { id } = c.req.valid("param");

  const barbershop = await db.query.barbershops.findFirst({
    where: (table, { eq }) => eq(table.id, id),
  });

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [deletedBarbershop] = await db
    .delete(barbershops)
    .where(eq(barbershops.id, id))
    .returning();

  return c.json(deletedBarbershop, api.STATUS_CODES.OK);
};
