import { STATUS_CODES } from "@panabarbero/constants/api";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { notifications } from "@panabarbero/db/schema";
import type { Notification } from "@panabarbero/db/schema/zod";
import { notificationSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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
    .returning({ uuid: notifications.uuid });

  await setCacheFromKey(`notifications:${created.uuid}`, created);

  return c.json({ id: created.uuid }, STATUS_CODES.CREATED);
};

export const getNotifications: ApiHandler<GetNotificationsRoute> = async (
  c,
) => {
  let notifications: Notification[] | undefined;

  const cachedNotifications = await getCacheFromKey(
    "notifications",
    notificationSchema.array(),
  );

  if (cachedNotifications) {
    notifications = cachedNotifications;
  } else {
    notifications = await db.query.notifications.findMany({
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!notifications || notifications.length === 0) {
    return c.json(
      { message: "Notifications not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey("notifications", notifications);

  return c.json(notifications, STATUS_CODES.OK);
};

export const getNotification: ApiHandler<GetNotificationRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let notification: Notification | undefined;

  const cachedNotification = await getCacheFromKey(
    `notifications:${uuid}`,
    notificationSchema,
  );

  if (cachedNotification) {
    notification = cachedNotification;
  } else {
    notification = await db.query.notifications.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!notification) {
    return c.json(
      { message: "Notification not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await setCacheFromKey(`notifications:${uuid}`, notification);

  return c.json(notification, STATUS_CODES.OK);
};

export const updateNotification: ApiHandler<UpdateNotificationRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let existing: Notification | undefined;

  const cachedNotification = await getCacheFromKey(
    `notifications:${uuid}`,
    notificationSchema,
  );

  if (cachedNotification) {
    existing = cachedNotification;
  } else {
    existing = await db.query.notifications.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!existing) {
    return c.json(
      { message: "Notification not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  const [updated] = await db
    .update(notifications)
    .set(json)
    .where(eq(notifications.uuid, uuid))
    .returning({
      uuid: notifications.uuid,
      type: notifications.type,
      reason: notifications.reason,
      text: notifications.text,
      senderUserId: notifications.senderUserId,
      receiverUserId: notifications.receiverUserId,
    });

  await setCacheFromKey(`notifications:${uuid}`, updated);

  return c.json(updated, STATUS_CODES.OK);
};

export const deleteNotification: ApiHandler<DeleteNotificationRoute> = async (
  c,
) => {
  const { uuid } = c.req.valid("query");

  let existing: Notification | undefined;

  const cachedNotification = await getCacheFromKey(
    `notifications:${uuid}`,
    notificationSchema,
  );

  if (cachedNotification) {
    existing = cachedNotification;
  } else {
    existing = await db.query.notifications.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!existing) {
    return c.json(
      { message: "Notification not found" },
      STATUS_CODES.NOT_FOUND,
    );
  }

  await Promise.all([
    db.delete(notifications).where(eq(notifications.uuid, uuid)).returning({
      uuid: notifications.uuid,
      type: notifications.type,
      reason: notifications.reason,
      text: notifications.text,
      senderUserId: notifications.senderUserId,
      receiverUserId: notifications.receiverUserId,
    }),
    deleteCacheFromKey(`notifications:${uuid}`),
  ]);

  return c.json({ message: "Notification deleted" }, STATUS_CODES.OK);
};
