import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { notifications } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreateNotificationRoute,
  DeleteNotificationRoute,
  GetNotificationRoute,
  GetNotificationsRoute,
  UpdateNotificationRoute,
} from "./routes";

export const createNotification: ApiHandler<CreateNotificationRoute> = async (
  c,
) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(notifications)
    .values(json)
    .returning({ id: notifications.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getNotifications: ApiHandler<GetNotificationsRoute> = async (
  c,
) => {
  const list = await db.query.notifications.findMany();

  if (!list || list.length === 0) {
    return c.json(
      { message: "Notifications not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getNotification: ApiHandler<GetNotificationRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  const notification = await db.query.notifications.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });

  if (!notification) {
    return c.json(
      { message: "Notification not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(notification, api.STATUS_CODES.OK);
};

export const updateNotification: ApiHandler<UpdateNotificationRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.notifications.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json(
      { message: "Notification not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(notifications)
    .set(json)
    .where(eq(notifications.uuid, uuid))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deleteNotification: ApiHandler<DeleteNotificationRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");

  const existing = await db.query.notifications.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json(
      { message: "Notification not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  const [deleted] = await db
    .delete(notifications)
    .where(eq(notifications.uuid, uuid))
    .returning();

  return c.json(deleted, api.STATUS_CODES.OK);
};
