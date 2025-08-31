import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { mobilePushTokens } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreateMobilePushTokenRoute,
  DeleteMobilePushTokenRoute,
  GetMobilePushTokenRoute,
  GetMobilePushTokensRoute,
  UpdateMobilePushTokenRoute,
} from "./routes";

export const createMobilePushToken: ApiHandler<
  CreateMobilePushTokenRoute
> = async (c) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(mobilePushTokens)
    .values(json)
    .returning({ id: mobilePushTokens.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getMobilePushTokens: ApiHandler<GetMobilePushTokensRoute> = async (
  c,
) => {
  const list = await db.query.mobilePushTokens.findMany();

  if (!list || list.length === 0) {
    return c.json(
      { message: "Mobile push tokens not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getMobilePushToken: ApiHandler<GetMobilePushTokenRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("param");

  const token = await db.query.mobilePushTokens.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });

  if (!token) {
    return c.json(
      { message: "Mobile push token not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(token, api.STATUS_CODES.OK);
};

export const updateMobilePushToken: ApiHandler<
  UpdateMobilePushTokenRoute
> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.mobilePushTokens.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json(
      { message: "Mobile push token not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(mobilePushTokens)
    .set(json)
    .where(eq(mobilePushTokens.uuid, uuid))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteMobilePushToken: ApiHandler<
  DeleteMobilePushTokenRoute
> = async (c) => {
  const { uuid } = c.req.valid("query");

  const existing = await db.query.mobilePushTokens.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json(
      { message: "Mobile push token not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  await db
    .delete(mobilePushTokens)
    .where(eq(mobilePushTokens.uuid, uuid))
    .returning();

  return c.json({ message: "Mobile push token deleted" }, api.STATUS_CODES.OK);
};
