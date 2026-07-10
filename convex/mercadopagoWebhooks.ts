"use node";

/** Signature-verified MercadoPago webhook reconciliation. */

import { ConvexError } from "convex/values";
import {
  InvalidWebhookSignatureError,
  Invoice,
  MercadoPagoConfig,
  Payment,
  PreApproval,
  WebhookSignatureValidator,
} from "mercadopago";
import { z } from "zod";

import { zInternalAction } from ".";
import { internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import {
  getMpPlan,
  isMpPaidProductKey,
  MP_CURRENCY_ID,
} from "./mercadopagoPlans";

type InvoiceResponse = Awaited<ReturnType<Invoice["get"]>>;
type PaymentResponse = Awaited<ReturnType<Payment["get"]>>;
type PreapprovalResponse = Awaited<ReturnType<PreApproval["get"]>>;

interface StoredSubscription {
  preapprovalId?: string;
  productKey: string;
  externalReference?: string;
  lastInvoiceId?: string;
}

interface PaymentOverride {
  status: string;
  updatedAt: number;
}

function mpConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new ConvexError(
      "MERCADOPAGO_ACCESS_TOKEN no está configurado en Convex.",
    );
  }

  return new MercadoPagoConfig({ accessToken });
}

function parsedTimestamp(value: string | undefined, fallback = Date.now()) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validateRemoteSubscription(
  remote: PreapprovalResponse,
  stored: StoredSubscription,
) {
  if (!isMpPaidProductKey(stored.productKey)) {
    return false;
  }

  const plan = getMpPlan(stored.productKey);
  const recurring = remote.auto_recurring;

  return (
    remote.id === stored.preapprovalId &&
    remote.external_reference === stored.externalReference &&
    Number(recurring?.transaction_amount) === plan.amountCop &&
    recurring?.currency_id === MP_CURRENCY_ID &&
    recurring?.frequency === plan.frequency &&
    recurring?.frequency_type === plan.frequencyType
  );
}

function validateInvoice(invoice: InvoiceResponse, stored: StoredSubscription) {
  if (!isMpPaidProductKey(stored.productKey)) {
    return false;
  }

  const plan = getMpPlan(stored.productKey);
  return (
    invoice.preapproval_id === stored.preapprovalId &&
    String(invoice.external_reference) === stored.externalReference &&
    Number(invoice.transaction_amount) === plan.amountCop &&
    invoice.currency_id === MP_CURRENCY_ID
  );
}

function calculatePaidThrough(invoice: InvoiceResponse, productKey: string) {
  if (!isMpPaidProductKey(productKey)) {
    return undefined;
  }

  const chargedAt = parsedTimestamp(invoice.debit_date ?? invoice.date_created);
  const paidThrough = new Date(chargedAt);
  const plan = getMpPlan(productKey);

  if (plan.frequencyType === "months") {
    const dayOfMonth = paidThrough.getUTCDate();
    paidThrough.setUTCDate(1);
    paidThrough.setUTCMonth(paidThrough.getUTCMonth() + plan.frequency);
    const lastDayOfTargetMonth = new Date(
      Date.UTC(paidThrough.getUTCFullYear(), paidThrough.getUTCMonth() + 1, 0),
    ).getUTCDate();
    paidThrough.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));
  } else {
    paidThrough.setUTCDate(paidThrough.getUTCDate() + plan.frequency);
  }

  return paidThrough.getTime();
}

export async function processAuthorizedPayment(
  ctx: ActionCtx,
  invoice: InvoiceResponse,
  override?: PaymentOverride,
): Promise<number> {
  if (!invoice.preapproval_id) {
    return 200;
  }

  const stored: StoredSubscription | null = await ctx.runQuery(
    internal.mercadopagoSubscriptions.getByPreapproval,
    { preapprovalId: invoice.preapproval_id },
  );
  if (!stored) {
    console.error(
      `[mercadopago] factura ${invoice.id} sin checkout local reconocido`,
    );
    return 200;
  }

  const remote = await new PreApproval(mpConfig()).get({
    id: invoice.preapproval_id,
  });
  if (
    !validateRemoteSubscription(remote, stored) ||
    !validateInvoice(invoice, stored)
  ) {
    console.error(
      `[mercadopago] factura ${invoice.id} no coincide con el checkout local`,
    );
    return 200;
  }

  const paymentId = invoice.payment?.id;
  const invoicePayment = invoice.payment;
  const paymentStatus =
    override?.status ??
    (invoicePayment?.status === "charged_back" &&
    invoicePayment.status_detail === "reimbursed"
      ? "reimbursed"
      : invoicePayment?.status);
  if (!invoice.id || !paymentId || !paymentStatus) {
    return 200;
  }

  await ctx.runMutation(
    internal.mercadopagoSubscriptions.recordAuthorizedPayment,
    {
      preapprovalId: invoice.preapproval_id,
      invoiceId: String(invoice.id),
      paymentId: String(paymentId),
      paymentStatus,
      paidThrough:
        paymentStatus === "approved" || paymentStatus === "reimbursed"
          ? calculatePaidThrough(invoice, stored.productKey)
          : undefined,
      paymentUpdatedAt:
        override?.updatedAt ??
        parsedTimestamp(invoice.last_modified ?? invoice.date_created),
      mpStatus: remote.status ?? "pending",
      remoteUpdatedAt: parsedTimestamp(remote.last_modified),
      nextPaymentDate: remote.next_payment_date,
    },
  );

  return 200;
}

async function processCreditPayment(
  ctx: ActionCtx,
  payment: PaymentResponse,
  checkoutReference: string,
): Promise<number> {
  const amount = Number(payment.transaction_amount);
  const refundedAmount = Number(payment.transaction_amount_refunded ?? 0);

  if (
    !payment.id ||
    !payment.status ||
    !payment.currency_id ||
    !Number.isFinite(amount) ||
    !Number.isFinite(refundedAmount)
  ) {
    return 200;
  }

  await ctx.runMutation(internal.credits.applyPayment, {
    paymentId: String(payment.id),
    checkoutReference,
    status: payment.status,
    statusDetail: payment.status_detail,
    transactionAmount: amount,
    currencyId: payment.currency_id,
    refundedAmount,
    remoteUpdatedAt: parsedTimestamp(
      payment.date_last_updated ?? payment.date_created,
    ),
  });

  return 200;
}

async function processSubscriptionPayment(
  ctx: ActionCtx,
  payment: PaymentResponse,
  stored: StoredSubscription,
): Promise<number> {
  if (!payment.id || !payment.status || !stored.preapprovalId) {
    return 200;
  }

  const refundedAmount = Number(payment.transaction_amount_refunded ?? 0);
  if (!Number.isFinite(refundedAmount)) {
    return 200;
  }

  const remote = await new PreApproval(mpConfig()).get({
    id: stored.preapprovalId,
  });
  if (
    !validateRemoteSubscription(remote, stored) ||
    !isMpPaidProductKey(stored.productKey) ||
    Number(payment.transaction_amount) !==
      getMpPlan(stored.productKey).amountCop ||
    payment.currency_id !== MP_CURRENCY_ID
  ) {
    console.error(
      `[mercadopago] pago ${payment.id} no coincide con la suscripción local`,
    );
    return 200;
  }

  const reimbursedChargeback =
    payment.status === "charged_back" && payment.status_detail === "reimbursed";
  const paymentStatus = reimbursedChargeback
    ? "reimbursed"
    : refundedAmount > 0
      ? "refunded"
      : payment.status;
  const paymentUpdatedAt = parsedTimestamp(
    payment.date_last_updated ?? payment.date_created,
  );

  if (paymentStatus === "approved" || paymentStatus === "reimbursed") {
    const numericPaymentId = Number(payment.id);
    if (!Number.isSafeInteger(numericPaymentId)) {
      return 200;
    }

    const invoices = await new Invoice(mpConfig()).search({
      options: { payment_id: numericPaymentId, limit: 1 },
    });
    const invoice = invoices.results?.[0];
    if (!invoice) {
      throw new ConvexError(
        "Mercado Pago aún no devolvió la factura de la suscripción.",
      );
    }
    if (String(invoice.payment?.id) !== String(payment.id)) {
      return 200;
    }
    return processAuthorizedPayment(ctx, invoice, {
      status: paymentStatus,
      updatedAt: paymentUpdatedAt,
    });
  }

  await ctx.runMutation(
    internal.mercadopagoSubscriptions.recordAuthorizedPayment,
    {
      preapprovalId: stored.preapprovalId,
      invoiceId: stored.lastInvoiceId ?? `payment:${payment.id}`,
      paymentId: String(payment.id),
      paymentStatus,
      paymentUpdatedAt,
      mpStatus: remote.status ?? "pending",
      remoteUpdatedAt: parsedTimestamp(remote.last_modified),
      nextPaymentDate: remote.next_payment_date,
    },
  );

  return 200;
}

async function processPayment(
  ctx: ActionCtx,
  paymentId: string,
): Promise<number> {
  const payment = await new Payment(mpConfig()).get({ id: paymentId });
  const checkoutReference = payment.external_reference;
  if (!checkoutReference) {
    return 200;
  }

  const creditCheckout = await ctx.runQuery(
    internal.credits.getCheckoutByReference,
    { checkoutReference },
  );
  if (creditCheckout) {
    return processCreditPayment(ctx, payment, checkoutReference);
  }

  const stored: StoredSubscription | null = await ctx.runQuery(
    internal.mercadopagoSubscriptions.getByExternalReference,
    { externalReference: checkoutReference },
  );
  if (stored) {
    return processSubscriptionPayment(ctx, payment, stored);
  }

  return 200;
}

export const processWebhookEvent = zInternalAction({
  args: z.object({
    xSignature: z.string().optional(),
    xRequestId: z.string().optional(),
    dataId: z.string().optional(),
    paymentId: z.string().optional(),
    type: z.string().optional(),
  }),
  handler: async (ctx, args): Promise<number> => {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!secret) {
      console.error("[mercadopago] MERCADOPAGO_WEBHOOK_SECRET no configurado.");
      return 500;
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: args.xSignature,
        xRequestId: args.xRequestId,
        dataId: args.dataId,
        secret,
        toleranceSeconds: 300,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        console.error(`[mercadopago] firma inválida: ${error.reason}`);
        return 401;
      }
      throw error;
    }

    if (
      (args.type === "topic_chargebacks_wh" || args.type === "chargebacks") &&
      args.paymentId
    ) {
      return processPayment(ctx, args.paymentId);
    }

    if (!args.dataId) {
      return 200;
    }

    if (args.type === "payment") {
      return processPayment(ctx, args.dataId);
    }

    if (args.type === "subscription_authorized_payment") {
      const invoice = await new Invoice(mpConfig()).get({ id: args.dataId });
      return processAuthorizedPayment(ctx, invoice);
    }

    if (args.type !== "subscription_preapproval") {
      return 200;
    }

    const remote = await new PreApproval(mpConfig()).get({ id: args.dataId });
    const stored: StoredSubscription | null = await ctx.runQuery(
      internal.mercadopagoSubscriptions.getByPreapproval,
      { preapprovalId: args.dataId },
    );

    if (!stored || !validateRemoteSubscription(remote, stored)) {
      console.error(
        `[mercadopago] preapproval ${args.dataId} sin checkout local válido`,
      );
      return 200;
    }

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.applyPreapprovalState,
      {
        preapprovalId: args.dataId,
        mpStatus: remote.status ?? "pending",
        payerEmail: remote.payer_email,
        reason: remote.reason,
        nextPaymentDate: remote.next_payment_date,
        remoteUpdatedAt: parsedTimestamp(remote.last_modified),
      },
    );

    return 200;
  },
});
