import { STATUS_CODES } from "@panabarbero/constants/api";
import { eq } from "@panabarbero/db";
import { db } from "@panabarbero/db/client";
import { payments } from "@panabarbero/db/schema";
import type { Payment } from "@panabarbero/db/schema/zod";
import { paymentSchema } from "@panabarbero/db/schema/zod";

import type { ApiHandler } from "@/config/types";
import {
  deleteCacheFromKey,
  getCacheFromKey,
  setCacheFromKey,
} from "@/services/cache";
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

  return c.json({ id: created.id }, STATUS_CODES.CREATED);
};

export const getPayments: ApiHandler<GetPaymentsRoute> = async (c) => {
  let payments: Payment[] | undefined;

  const cachedPayments = await getCacheFromKey(
    "payments",
    paymentSchema.array(),
  );

  if (cachedPayments) {
    payments = cachedPayments;
  } else {
    payments = await db.query.payments.findMany({
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!payments || payments.length === 0) {
    return c.json({ message: "Payments not found" }, STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey("payments", payments);

  return c.json(payments, STATUS_CODES.OK);
};

export const getPayment: ApiHandler<GetPaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("param");

  let payment: Payment | undefined;

  const cachedPayment = await getCacheFromKey(
    `payments:${uuid}`,
    paymentSchema,
  );

  if (cachedPayment) {
    payment = cachedPayment;
  } else {
    payment = await db.query.payments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!payment) {
    return c.json({ message: "Payment not found" }, STATUS_CODES.NOT_FOUND);
  }

  await setCacheFromKey(`payments:${uuid}`, payment);

  return c.json(payment, STATUS_CODES.OK);
};

export const updatePayment: ApiHandler<UpdatePaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("query");
  const json = c.req.valid("json");

  let payment: Payment | undefined;

  const cachedPayment = await getCacheFromKey(
    `payments:${uuid}`,
    paymentSchema,
  );

  if (cachedPayment) {
    payment = cachedPayment;
  } else {
    payment = await db.query.payments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!payment) {
    return c.json({ message: "Payment not found" }, STATUS_CODES.NOT_FOUND);
  }

  const [updated] = await db
    .update(payments)
    .set(json)
    .where(eq(payments.uuid, uuid))
    .returning({
      uuid: payments.uuid,
      appointmentId: payments.appointmentId,
      transactionId: payments.transactionId,
      paymentDate: payments.paymentDate,
      amount: payments.amount,
      method: payments.method,
      status: payments.status,
    });

  await setCacheFromKey(`payments:${uuid}`, updated);

  return c.json(updated, STATUS_CODES.OK);
};

export const deletePayment: ApiHandler<DeletePaymentRoute> = async (c) => {
  const { uuid } = c.req.valid("query");

  let payment: Payment | undefined;

  const cachedPayment = await getCacheFromKey(
    `payments:${uuid}`,
    paymentSchema,
  );

  if (cachedPayment) {
    payment = cachedPayment;
  } else {
    payment = await db.query.payments.findFirst({
      where: (t, { eq }) => eq(t.uuid, uuid),
      columns: {
        id: false,
        createdAt: false,
        updatedAt: false,
      },
    });
  }

  if (!payment) {
    return c.json({ message: "Payment not found" }, STATUS_CODES.NOT_FOUND);
  }

  await Promise.all([
    db.delete(payments).where(eq(payments.uuid, uuid)).returning({
      uuid: payments.uuid,
      appointmentId: payments.appointmentId,
      amount: payments.amount,
      status: payments.status,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
    }),
    deleteCacheFromKey(`payments:${uuid}`),
  ]);

  return c.json({ message: "Payment deleted" }, STATUS_CODES.OK);
};
