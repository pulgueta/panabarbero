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
  Payment,
  PreApproval,
  Preference,
  WebhookSignatureValidator,
} from "mercadopago";
import { z } from "zod";

import { zAuthAction, zInternalAction } from ".";
import { api, internal } from "./_generated/api";
import { errorMessages } from "./errors";
import {
  getMpPlan,
  isCreditProductKey,
  MP_CREDIT_PACKS,
  MP_CURRENCY_ID,
  MP_FREE_PRODUCT_KEY,
  MP_PAID_PRODUCT_KEYS,
  normalizeMpStatus,
} from "./mercadopagoPlans";
import { siteUrl } from "./notificationCopy";
import { CREDIT_PRODUCT_KEYS } from "./plans";

const paidProductKeySchema = z.enum(MP_PAID_PRODUCT_KEYS);
const creditProductKeySchema = z.enum(CREDIT_PRODUCT_KEYS);

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
    const plan = getMpPlan(args.productKey);

    // A cancelled preapproval is terminal at MercadoPago (only paused ones can
    // be reactivated), so nothing that can still bill may ever be cancelled
    // implicitly here. Reconcile every open paid row against MercadoPago's
    // live status first (webhooks can be missed), then:
    //   - a row still authorized/paused BLOCKS the new checkout — switching
    //     plans requires an explicit cancel from the profile, since MercadoPago
    //     has no atomic plan-switch for plan-less preapprovals;
    //   - rows still `pending` (abandoned checkouts, no payment method
    //     attached) are cancelled so a stale init_point can never authorize a
    //     second recurrence later.
    const openPaid = await ctx.runQuery(
      internal.mercadopagoSubscriptions.listOpenPaidSubscriptions,
      { userId },
    );

    const abandonedPending: typeof openPaid = [];
    let hasLiveSubscription = false;

    for (const row of openPaid) {
      let remoteStatus: string | undefined;

      try {
        const remote = await new PreApproval(mpConfig()).get({
          id: row.preapprovalId,
        });
        remoteStatus = remote.status;

        if (remoteStatus && normalizeMpStatus(remoteStatus) !== row.status) {
          await ctx.runMutation(
            internal.mercadopagoSubscriptions.upsertByPreapproval,
            {
              userId,
              productKey: row.productKey,
              preapprovalId: row.preapprovalId,
              mpStatus: remoteStatus,
            },
          );
        }
      } catch (error) {
        // Remote state unreachable — fail closed on the local status below: a
        // row that locally claims it can bill still blocks the new checkout.
        console.error(
          `[mercadopago] no se pudo consultar el preapproval ${row.preapprovalId}`,
          error,
        );
      }

      // Classify on the RAW remote status, not the normalized one: only an
      // exact remote `pending` may be swept, and any status this integration
      // doesn't model fails closed as live (`normalizeMpStatus` defaults
      // unknowns to `pending`, which would mark a billable agreement as
      // sweepable). A row whose remote state could not be verified is never
      // cancelled either — a local `pending` one is just skipped (it cannot
      // bill), anything else blocks.
      if (remoteStatus === "pending") {
        abandonedPending.push(row);
        continue;
      }

      const isTerminalRemote =
        remoteStatus === "cancelled" || remoteStatus === "canceled";
      const isUnverifiedLocalPending =
        !remoteStatus && row.status === "pending";

      if (!isTerminalRemote && !isUnverifiedLocalPending) {
        hasLiveSubscription = true;
      }
    }

    if (hasLiveSubscription) {
      throw new ConvexError(
        "Ya tienes una suscripción activa. Para cambiar de plan, primero cancélala desde tu perfil o desde tu cuenta de MercadoPago.",
      );
    }

    for (const row of abandonedPending) {
      try {
        const cancelled = await new PreApproval(mpConfig()).update({
          id: row.preapprovalId,
          body: { status: "cancelled" },
        });

        await ctx.runMutation(
          internal.mercadopagoSubscriptions.upsertByPreapproval,
          {
            userId,
            productKey: row.productKey,
            preapprovalId: row.preapprovalId,
            mpStatus: cancelled.status ?? "cancelled",
          },
        );
      } catch (error) {
        // A `pending` preapproval has no payment method attached and cannot
        // bill, so a failed cleanup never blocks the new checkout — log it and
        // let the next checkout attempt retry the cancel.
        console.error(
          `[mercadopago] preapproval pendiente ${row.preapprovalId} no cancelado`,
          error,
        );
      }
    }

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
        back_url: `${siteUrl()}/profile?tab=plans&subscription=success`,
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

    // Prefer the live paid preapproval over the effective row: a paused paid
    // subscription is shadowed by the active free row on status priority, yet
    // it must stay cancellable — MercadoPago resumes billing a paused
    // preapproval on the next successful payment retry.
    const target =
      current?.livePaid ??
      (current?.preapprovalId && current.productKey
        ? {
            preapprovalId: current.preapprovalId,
            productKey: current.productKey,
          }
        : null);

    if (!target) {
      if (current?.productKey === MP_FREE_PRODUCT_KEY) {
        throw new ConvexError("No puedes cancelar el plan gratis.");
      }
      throw new ConvexError(errorMessages.notFound("suscripción"));
    }

    const preApproval = new PreApproval(mpConfig());
    const updated = await preApproval.update({
      id: target.preapprovalId,
      body: { status: "cancelled" },
    });

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.upsertByPreapproval,
      {
        userId,
        productKey: target.productKey,
        preapprovalId: target.preapprovalId,
        mpStatus: updated.status ?? "cancelled",
      },
    );

    return { status: updated.status ?? "cancelled" };
  },
});

/**
 * Create a hosted MercadoPago Checkout Pro preference for a one-time SMS/email
 * credit pack and return the `init_point` to redirect the buyer to. Credits are
 * never granted here — only a verified `payment` webhook grants them, exactly
 * once, after fetching the approved payment from MercadoPago.
 */
export const createCreditCheckout = zAuthAction({
  args: z.object({
    productKey: creditProductKeySchema,
    barbershopId: z.string(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;

    // Only the barbershop owner may buy credits for it (throws otherwise).
    const barbershop = await ctx.runQuery(
      internal.credits.getOwnedBarbershopForCredits,
      { barbershopId: args.barbershopId, userId },
    );

    const pack = MP_CREDIT_PACKS[args.productKey];
    // `<userId>|<barbershopId>|<productKey>` — the webhook re-derives the
    // barbershop and amount from here; nothing about the grant is client-owned.
    const externalReference = `${userId}|${barbershop._id}|${args.productKey}`;

    const preference = await new Preference(mpConfig()).create({
      body: {
        items: [
          {
            id: args.productKey,
            title: pack.title,
            description: pack.description,
            quantity: 1,
            unit_price: pack.amountCop,
            currency_id: MP_CURRENCY_ID,
          },
        ],
        external_reference: externalReference,
        back_urls: {
          success: `${siteUrl()}/profile?tab=plans&credits=success`,
          failure: `${siteUrl()}/profile?tab=plans&credits=failure`,
          pending: `${siteUrl()}/profile?tab=plans&credits=pending`,
        },
        auto_return: "approved",
      },
      requestOptions: { idempotencyKey: crypto.randomUUID() },
    });

    if (!preference.init_point) {
      throw new ConvexError(
        "MercadoPago no devolvió un enlace de pago para los créditos.",
      );
    }

    return { initPoint: preference.init_point, preferenceId: preference.id };
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

    if (!args.dataId) {
      return 200;
    }

    // One-time credit purchases (Checkout Pro) arrive as `payment` events. Grant
    // credits only from an APPROVED payment fetched from MercadoPago, keyed by
    // payment id for idempotency, with the charged amount validated against our
    // server-owned catalog so the client can never inflate a grant.
    if (args.type === "payment") {
      const payment = await new Payment(mpConfig()).get({ id: args.dataId });

      if (payment.status !== "approved") {
        return 200;
      }

      const ref = payment.external_reference;
      if (!ref || !ref.includes("|")) {
        return 200;
      }

      const [, creditBarbershopId, creditProductKey] = ref.split("|");
      if (!creditBarbershopId || !isCreditProductKey(creditProductKey)) {
        return 200;
      }

      const pack = MP_CREDIT_PACKS[creditProductKey];

      if (Number(payment.transaction_amount) !== pack.amountCop) {
        console.error(
          `[mercadopago] pago ${payment.id} con monto inesperado (${payment.transaction_amount})`,
        );
        return 200;
      }

      await ctx.runMutation(internal.credits.addPurchasedCredits, {
        orderId: String(payment.id),
        barbershopId: creditBarbershopId,
        type: pack.type,
        amount: pack.credits,
      });

      return 200;
    }

    // Only subscription lifecycle changes affect plan access. (`subscription_
    // authorized_payment` recurring-charge events are acknowledged but not yet
    // reconciled for delinquency — see docs/mercadopago-subscriptions.md.)
    if (args.type !== "subscription_preapproval") {
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

    // MercadoPago's `/preapproval` response can return `transaction_amount` as a
    // string even though the SDK types it as a number; coerce before the
    // `z.number()`-validated mutation, and omit it when it isn't a finite value.
    const rawAmount = subscription.auto_recurring?.transaction_amount;
    const amount =
      rawAmount != null && Number.isFinite(Number(rawAmount))
        ? Number(rawAmount)
        : undefined;

    await ctx.runMutation(
      internal.mercadopagoSubscriptions.upsertByPreapproval,
      {
        userId,
        productKey,
        preapprovalId: subscription.id ?? args.dataId,
        mpStatus: subscription.status ?? "pending",
        payerEmail: subscription.payer_email,
        reason: subscription.reason,
        amount,
        currencyId: subscription.auto_recurring?.currency_id,
        externalReference,
        nextPaymentDate: subscription.next_payment_date,
      },
    );

    return 200;
  },
});
