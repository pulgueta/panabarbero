import { auth } from "@panabarbero/auth";
import { STATUS_CODES } from "@panabarbero/constants";
import { db } from "@panabarbero/db/client";
import { barbershops } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import { slugify } from "@/utils/lib";
import type { CreateBarbershopRoute } from "./routes";

export const createBarbershop: ApiHandler<CreateBarbershopRoute> = async (
  c,
) => {
  const jsonBarbershop = c.req.valid("json");

  let slugifiedName = slugify(jsonBarbershop.name);

  const existingBarbershopSlug = await db.query.barbershops.findFirst({
    where: (t, { eq, sql, and }) =>
      and(
        eq(t.name, jsonBarbershop.name),
        eq(sql`lower(organization.slug)`, slugifiedName),
      ),
    with: {
      organization: {
        columns: {
          slug: true,
        },
      },
    },
  });

  if (existingBarbershopSlug) {
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

  if (!createdBarbershopOrganization) {
    return c.json(
      {
        error: "Failed to create organization",
      },
      STATUS_CODES.INTERNAL_SERVER_ERROR,
    );
  }

  const [createdBarbershop] = await db
    .insert(barbershops)
    .values({
      ...jsonBarbershop,
      organizationId: createdBarbershopOrganization.id,
    })
    .returning();

  return c.json(createdBarbershop, STATUS_CODES.CREATED);
};
