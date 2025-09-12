import { STATUS_CODES } from "@panabarbero/constants/api";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { mobilePushTokens } from "@panabarbero/db/schema";
import type { MobilePushToken } from "@panabarbero/db/schema/zod";
import { mobilePushTokenSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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

  return c.json({ id: created.id }, STATUS_CODES.CREATED);
};

export const getMobilePushTokens: ApiHandler<GetMobilePushTokensRoute> = async (
  c,
) => {
  let tokens: MobilePushToken[] | undefined;

  const cachedTokens = await getCacheFromKey(
    "push-tokens",
    mobilePushTokenSchema.array(),
  );

  if (cachedTokens) {
    tokens = cachedTokens;
  } else {
    tokens = await db.query.mobilePushTokens.findMany({
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!tokens || tokens.length === 0) {
    return c.json(
      { message: "Mobile push tokens not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey("push-tokens", tokens);

  return c.json(tokens, STATUS_CODES.OK);
};

export const getMobilePushToken: ApiHandler<GetMobilePushTokenRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("param");

  let token: MobilePushToken | undefined;

  const cachedToken = await getCacheFromKey(
    `push-tokens:${uuid}`,
    mobilePushTokenSchema,
  );

  if (cachedToken) {
    token = cachedToken;
  } else {
    token = await db.query.mobilePushTokens.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!token) {
    return c.json(
      { message: "Mobile push token not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey(`push-tokens:${uuid}`, token);

  return c.json(token, STATUS_CODES.OK);
};

export const updateMobilePushToken: ApiHandler<
  UpdateMobilePushTokenRoute
> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let token: MobilePushToken | undefined;

  const cachedToken = await getCacheFromKey(
    `push-tokens:${uuid}`,
    mobilePushTokenSchema,
  );

  if (cachedToken) {
    token = cachedToken;
  } else {
    token = await db.query.mobilePushTokens.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }

  if (!token) {
    return c.json(
      { message: "Mobile push token not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(mobilePushTokens)
    .set(json)
    .where(eq(mobilePushTokens.uuid, uuid))
    .returning({
      uuid: mobilePushTokens.uuid,
      token: mobilePushTokens.token,
      userId: mobilePushTokens.userId,
    });

  await setCacheFromKey(`push-tokens:${uuid}`, updated);

  return c.json(updated, STATUS_CODES.OK);
};

export const deleteMobilePushToken: ApiHandler<
  DeleteMobilePushTokenRoute
> = async (c) => {
  const { uuid } = c.req.valid("query");

  let token: MobilePushToken | undefined;

  const cachedToken = await getCacheFromKey(
    `push-tokens:${uuid}`,
    mobilePushTokenSchema,
  );

  if (cachedToken) {
    token = cachedToken;
  } else {
    token = await db.query.mobilePushTokens.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: { id: false, createdAt: false, updatedAt: false },
    });
  }
  if (!token) {
    return c.json(
      { message: "Mobile push token not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await Promise.all([
    db
      .delete(mobilePushTokens)
      .where(eq(mobilePushTokens.uuid, uuid))
      .returning(),
    deleteCacheFromKey(`push-tokens:${uuid}`),
  ]);

  return c.json({ message: "Mobile push token deleted" }, STATUS_CODES.OK);
};
