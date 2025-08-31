import { api } from "@panabarbero/constants";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { payments } from "@panabarbero/db/schema";

import type { ApiHandler } from "@/config/types";
import type {
  CreatePaymentRoute,
  DeletePaymentRoute,
  GetPaymentRoute,
  GetPaymentsRoute,
  UpdatePaymentRoute,
} from "./routes";

export const createPayment: ApiHandler<CreatePaymentRoute> = async (c) => {
  const json = c.req.valid("json");

  const [created] = await db
    .insert(payments)
    .values(json)
    .returning({ id: payments.uuid });

  return c.json({ id: created.id }, api.STATUS_CODES.CREATED);
};

export const getPayments: ApiHandler<GetPaymentsRoute> = async (c) => {
  const list = await db.query.payments.findMany();

  if (!list || list.length === 0) {
    return c.json(
      { message: "Payments not found" },
      api.STATUS_CODES.NOT_FOUND,
    );
  }

  return c.json(list, api.STATUS_CODES.OK);
};

export const getPayment: ApiHandler<GetPaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  const payment = await db.query.payments.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });

  if (!payment) {
    return c.json({ message: "Payment not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  return c.json(payment, api.STATUS_CODES.OK);
};

export const updatePayment: ApiHandler<UpdatePaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  const existing = await db.query.payments.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json({ message: "Payment not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(payments)
    .set(json)
    .where(eq(payments.uuid, uuid))
    .returning();

  return c.json(updated, api.STATUS_CODES.OK);
};

export const deletePayment: ApiHandler<DeletePaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  const existing = await db.query.payments.findFirst({
    where: (t, { eq }) => eq(t.uuid, uuid),
  });
  if (!existing) {
    return c.json({ message: "Payment not found" }, api.STATUS_CODES.NOT_FOUND);
  }

  const [deleted] = await db
    .delete(payments)
    .where(eq(payments.uuid, uuid))
    .returning();

  return c.json(deleted, api.STATUS_CODES.OK);
};
