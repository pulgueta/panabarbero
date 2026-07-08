"use node";

/**
 * MercadoPago Subscriptions (Preapproval) integration — network layer.
 *
 * Runs in the Node runtime because it uses the official `mercadopago` Node SDK
 * (`PreApproval` for the recurring-billing agreement, `WebhookSignatureValidator`
 * for HMAC verification). All persistence is delegated to
 * `convex/mercadopagoSubscriptions.ts` via internal mutations so this file never
 * touches the database directly.
 *
 * Checkout model: **subscription without an associated plan, created as
 * `pending`**. MercadoPago returns an `init_point` hosted-checkout URL; the buyer
 * picks a payment method there and authorizes the recurrence. This mirrors
 * Polar's hosted-checkout redirect and avoids any client-side card tokenization.
 *
 * Environment variables (set in the Convex dashboard):
 *   - MERCADOPAGO_ACCESS_TOKEN  — TEST-... or APP_USR-... seller token
 *   - MERCADOPAGO_WEBHOOK_SECRET — signature secret from the webhook config
 */

import { ConvexError } from "convex/values";
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  PreApproval,
  WebhookSignatureValidator,
} from "mercadopago";
import { z } from "zod";

import { zAuthAction, zInternalAction } from ".";
import { api, internal } from "./_generated/api";
import { errorMessages } from "./errors";
import {
  getMpPlan,
  MP_CURRENCY_ID,
  type MpPaidProductKey,
} from "./mercadopagoPlans";
import { siteUrl } from "./notificationCopy";

const paidProductKeySchema = z.enum([
  "barberiaMonthly",
  "barberiaYearly",
  "barberiaProfMonthly",
  "barberiaProfYearly",
]);

/** Build an SDK config from the seller access token. Throws if unset. */
function mpConfig(): MercadoPagoConfig {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new ConvexError(
      "MERCADOPAGO_ACCESS_TOKEN no está configurado en Convex.",
    );
  }

  return new MercadoPagoConfig({ accessToken });
}

/**
 * Create a subscription checkout for a paid plan and return the MercadoPago
 * hosted-checkout URL to redirect the buyer to. A local `pending` row is
 * recorded immediately; the webhook promotes it to `active` once the buyer
 * authorizes the recurrence.
 */
export const createSubscriptionCheckout = zAuthAction({
  args: z.object({
    productKey: paidProductKeySchema,
    /**
     * Override the payer email. Defaults to the authenticated user's email.
     * In the sandbox use a MercadoPago **test buyer** email here.
     */
    payerEmail: z.email().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const plan = getMpPlan(args.productKey as MpPaidProductKey);

    const payerEmail =
      args.payerEmail ??
      (
        (await ctx.runQuery(api.auth.getCurrentUser, {})) as {
          email?: string;
        } | null
      )?.email;

    if (!payerEmail) {
      throw new ConvexError(
        "No se pudo determinar el correo del pagador para la suscripción.",
      );
    }

    const externalReference = `${userId}|${args.productKey}`;
    const preApproval = new PreApproval(mpConfig());

    const subscription = await preApproval.create({
      body: {
        reason: plan.reason,
        external_reference: externalReference,
        payer_email: payerEmail,
        back_url: `${siteUrl()}/mercadopago?status=success`,
        status: "pending",
        auto_recurring: {
          frequency: plan.frequency,
          frequency_type: plan.frequencyType,
          transaction_amount: plan.amountCop,
          currency_id: MP_CURRENCY_ID,
        },
      },
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    });

    if (!subscription.id || !subscription.init_point) {
      throw new ConvexError(
        "MercadoPago no devolvió un enlace de pago para la suscripción.",
      );
    }

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.upsertByPreapproval,
      {
        userId,
        productKey: args.productKey,
        preapprovalId: subscription.id,
        mpStatus: subscription.status ?? "pending",
        payerEmail: subscription.payer_email ?? payerEmail,
        reason: subscription.reason ?? plan.reason,
        amount: plan.amountCop,
        currencyId: MP_CURRENCY_ID,
        initPoint: subscription.init_point,
        externalReference,
        nextPaymentDate: subscription.next_payment_date,
      },
    );

    return {
      initPoint: subscription.init_point,
      preapprovalId: subscription.id,
    };
  },
});

/**
 * Cancel the current user's paid subscription at MercadoPago and mirror the new
 * `cancelled` status locally.
 */
export const cancelSubscription = zAuthAction({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;

    const current = await ctx.runQuery(
      api.mercadopagoSubscriptions.getMySubscription,
      {},
    );

    if (!current?.preapprovalId || !current.productKey) {
      throw new ConvexError(errorMessages.notFound("suscripción"));
    }

    const preApproval = new PreApproval(mpConfig());
    const updated = await preApproval.update({
      id: current.preapprovalId,
      body: { status: "cancelled" },
    });

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.upsertByPreapproval,
      {
        userId,
        productKey: current.productKey,
        preapprovalId: current.preapprovalId,
        mpStatus: updated.status ?? "cancelled",
      },
    );

    return { status: updated.status ?? "cancelled" };
  },
});

/**
 * Process a MercadoPago webhook notification. Called by the `/mercadopago/webhook`
 * HTTP route with the values needed for signature verification. Returns the HTTP
 * status the route should reply with (200 acknowledged, 401 bad signature, 500
 * transient error → MercadoPago retries).
 *
 * Only `subscription_preapproval` events change access; other topics are
 * acknowledged and ignored.
 */
export const processWebhookEvent = zInternalAction({
  args: z.object({
    xSignature: z.string().optional(),
    xRequestId: z.string().optional(),
    dataId: z.string().optional(),
    type: z.string().optional(),
  }),
  handler: async (ctx, args) => {
    const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (!secret) {
      console.error(
        "[mercadopago] MERCADOPAGO_WEBHOOK_SECRET no configurado — no se puede validar la firma.",
      );
      return 500;
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature: args.xSignature,
        xRequestId: args.xRequestId,
        dataId: args.dataId,
        secret,
      });
    } catch (error) {
      if (error instanceof InvalidWebhookSignatureError) {
        console.error(`[mercadopago] firma inválida: ${error.reason}`);
        return 401;
      }
      throw error;
    }

    // Only subscription lifecycle changes affect plan access.
    if (args.type !== "subscription_preapproval" || !args.dataId) {
      return 200;
    }

    const subscription = await new PreApproval(mpConfig()).get({
      id: args.dataId,
    });

    const externalReference = subscription.external_reference;
    if (!externalReference || !externalReference.includes("|")) {
      console.error(
        `[mercadopago] preapproval ${args.dataId} sin external_reference mapeable`,
      );
      return 200;
    }

    const [userId, productKey] = externalReference.split("|");
    if (!userId || !productKey) {
      return 200;
    }

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.upsertByPreapproval,
      {
        userId,
        productKey,
        preapprovalId: subscription.id ?? args.dataId,
        mpStatus: subscription.status ?? "pending",
        payerEmail: subscription.payer_email,
        reason: subscription.reason,
        amount: subscription.auto_recurring?.transaction_amount,
        currencyId: subscription.auto_recurring?.currency_id,
        externalReference,
        nextPaymentDate: subscription.next_payment_date,
      },
    );

    return 200;
  },
});
