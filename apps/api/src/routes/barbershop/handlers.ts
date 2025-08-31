import { auth } from "@panabarbero/auth";
import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { barbershops } from "@panabarbero/db/schema";
import type { BarbershopWithOrganization } from "@panabarbero/db/schema/zod";
import { barbershopWithOrganizationSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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
  let barbershop: BarbershopWithOrganization | undefined;

  const cachedBarbershop = await getCacheFromKey(
    `barbershops:${jsonBarbershop.name}`,
    barbershopWithOrganizationSchema,
  );

  if (cachedBarbershop) {
    barbershop = cachedBarbershop;
  } else {
    barbershop = await db.query.barbershops.findFirst({
      where: (table, { eq, sql, and }) =>
        and(
          eq(table.name, jsonBarbershop.name),
          eq(sql`lower(organization.slug)`, slugifiedName),
        ),
      with: {
        organization: true,
      },
    });
  }

  if (barbershop?.organization?.slug === slugifiedName) {
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

  const [created] = await db
    .insert(barbershops)
    .values({
      ...jsonBarbershop,
      organizationId: createdBarbershopOrganization?.id ?? "",
    })
    .returning({ id: barbershops.uuid });

  await setCacheFromKey(`barbershops:${created.id}`, created);

  return c.json(
    {
      id: created.id,
    },
    api.STATUS_CODES.CREATED,
  );
};

export const getBarbershops: ApiHandler<GetBarbershopsRoute> = async (c) => {
  const cachedBarbershops = await getCacheFromKey(
    api.CACHE_KEYS.BARBERSHOP,
    barbershopWithOrganizationSchema.array(),
  );

  if (cachedBarbershops) {
    return c.json(cachedBarbershops, api.STATUS_CODES.OK);
  }

  const barbershopsWithOrganization = await db.query.barbershops.findMany({
    with: {
      organization: true,
    },
  });

  if (!barbershopsWithOrganization) {
    return c.json(
      { message: "Barbershops not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey(api.CACHE_KEYS.BARBERSHOP, barbershopsWithOrganization);

  return c.json(barbershopsWithOrganization, api.STATUS_CODES.OK);
};

export const getBarbershop: ApiHandler<GetBarbershopRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let barbershop: BarbershopWithOrganization | undefined;

  const cachedBarbershop = await getCacheFromKey(
    `barbershops:${uuid}`,
    barbershopWithOrganizationSchema,
  );

  if (cachedBarbershop) {
    barbershop = cachedBarbershop;
  } else {
    barbershop = await db.query.barbershops.findFirst({
      where: (table, { eq }) => eq(table.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
      with: {
        organization: true,
      },
    });
  }

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey(`barbershops:${uuid}`, barbershop);

  return c.json(barbershop, api.STATUS_CODES.OK);
};

export const updateBarbershop: ApiHandler<UpdateBarbershopRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");
  const jsonBarbershop = c.req.valid("json");

  let barbershop: BarbershopWithOrganization | undefined;

  const cachedBarbershop = await getCacheFromKey(
    `barbershops:${uuid}`,
    barbershopWithOrganizationSchema,
  );

  if (cachedBarbershop) {
    barbershop = cachedBarbershop;
  } else {
    barbershop = await db.query.barbershops.findFirst({
      where: (table, { eq }) => eq(table.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
      with: {
        organization: true,
      },
    });
  }

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [updatedBarbershop] = await db
    .update(barbershops)
    .set(jsonBarbershop)
    .where(eq(barbershops.uuid, uuid))
    .returning({
      uuid: barbershops.uuid,
      name: barbershops.name,
      description: barbershops.description,
      organizationId: barbershops.organizationId,
      address: barbershops.address,
      coordinates: barbershops.coordinates,
      contactPhone: barbershops.contactPhone,
      socialMedia: barbershops.socialMedia,
      isActive: barbershops.isActive,
      gracePeriodMinutes: barbershops.gracePeriodMinutes,
      ownerId: barbershops.ownerId,
      availableDays: barbershops.availableDays,
      city: barbershops.city,
      state: barbershops.state,
      zipCode: barbershops.zipCode,
      bannerUrl: barbershops.bannerUrl,
      contactEmail: barbershops.contactEmail,
      websiteUrl: barbershops.websiteUrl,
    });

  await setCacheFromKey(`barbershops:${uuid}`, updatedBarbershop);

  return c.json(updatedBarbershop, api.STATUS_CODES.OK);
};

export const deleteBarbershop: ApiHandler<DeleteBarbershopRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");

  let barbershop: BarbershopWithOrganization | undefined;

  const cachedBarbershop = await getCacheFromKey(
    `barbershops:${uuid}`,
    barbershopWithOrganizationSchema,
  );

  if (cachedBarbershop) {
    barbershop = cachedBarbershop;
  } else {
    barbershop = await db.query.barbershops.findFirst({
      where: (table, { eq }) => eq(table.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
      with: {
        organization: true,
      },
    });
  }

  if (!barbershop) {
    return c.json(
      { message: "Barbershop not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  await Promise.all([
    db.delete(barbershops).where(eq(barbershops.uuid, uuid)).returning(),
    deleteCacheFromKey(`barbershops:${uuid}`),
  ]);

  return c.json({ message: "Barbershop deleted" }, api.STATUS_CODES.OK);
};
