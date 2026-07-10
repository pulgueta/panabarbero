"use node";

/** MercadoPago checkout, cancellation, and account-deletion network actions. */

import { ConvexError } from "convex/values";
import { MercadoPagoConfig, PreApproval, Preference } from "mercadopago";
import { z } from "zod";

import { zAuthAction, zInternalAction } from ".";
import { api, internal } from "./_generated/api";
import type { ActionCtx } from "./_generated/server";
import { errorMessages } from "./errors";
import {
  getMpPlan,
  isMpPaidProductKey,
  MP_CURRENCY_ID,
  MP_FREE_PRODUCT_KEY,
  MP_PAID_PRODUCT_KEYS,
} from "./mercadopagoPlans";
import { siteUrl } from "./notificationCopy";
import { CREDIT_PRODUCT_KEYS } from "./plans";

const paidProductKeySchema = z.enum(MP_PAID_PRODUCT_KEYS);
const creditProductKeySchema = z.enum(CREDIT_PRODUCT_KEYS);
const CREDIT_CHECKOUT_TTL_MS = 30 * 60 * 1000;

type PreapprovalResponse = Awaited<ReturnType<PreApproval["get"]>>;

interface RemotePreapprovalState {
  status?: string;
  payer_email?: string;
  reason?: string;
  next_payment_date?: string | number;
  last_modified?: string | number;
}

interface OpenPaidRow {
  preapprovalId: string;
  productKey: string;
  status: "active" | "paused" | "pending" | "canceled";
}

interface CheckoutAttempt {
  userId: string;
  productKey: string;
  payerEmail: string;
  checkoutReference: string;
  idempotencyKey: string;
  state: "creating" | "ready";
  leaseExpiresAt: number;
  preapprovalId?: string;
  initPoint?: string;
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

function remoteTimestamp(value: string | number | undefined) {
  if (value === undefined) {
    return Date.now();
  }

  const parsed =
    typeof value === "number"
      ? value < 1_000_000_000_000
        ? value * 1000
        : value
      : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function isTerminalStatus(status: string | undefined) {
  return status === "cancelled" || status === "canceled";
}

function assertPreapprovalMatchesCheckout(
  subscription: PreapprovalResponse,
  checkout: Pick<CheckoutAttempt, "checkoutReference" | "productKey">,
) {
  if (!isMpPaidProductKey(checkout.productKey)) {
    throw new ConvexError("El checkout contiene un plan desconocido.");
  }

  const plan = getMpPlan(checkout.productKey);
  const recurring = subscription.auto_recurring;
  const amount = Number(recurring?.transaction_amount);

  if (
    subscription.external_reference !== checkout.checkoutReference ||
    amount !== plan.amountCop ||
    recurring?.currency_id !== MP_CURRENCY_ID ||
    recurring.frequency !== plan.frequency ||
    recurring.frequency_type !== plan.frequencyType
  ) {
    throw new ConvexError(
      "La suscripción de Mercado Pago no coincide con el checkout creado por PanaBarbero.",
    );
  }
}

/** Create or recover one remote checkout from its durable immutable claim. */
async function materializeSubscriptionCheckout(
  ctx: ActionCtx,
  attempt: CheckoutAttempt,
) {
  if (!isMpPaidProductKey(attempt.productKey)) {
    throw new ConvexError("El checkout contiene un plan desconocido.");
  }

  const plan = getMpPlan(attempt.productKey);
  const subscription = await new PreApproval(mpConfig()).create({
    body: {
      reason: plan.reason,
      external_reference: attempt.checkoutReference,
      payer_email: attempt.payerEmail,
      back_url: `${siteUrl()}/profile?tab=plans&subscription=success`,
      status: "pending",
      auto_recurring: {
        frequency: plan.frequency,
        frequency_type: plan.frequencyType,
        transaction_amount: plan.amountCop,
        currency_id: MP_CURRENCY_ID,
      },
    },
    requestOptions: { idempotencyKey: attempt.idempotencyKey },
  });

  if (!subscription.id || !subscription.init_point) {
    throw new ConvexError(
      "Mercado Pago no devolvió un enlace de pago para la suscripción.",
    );
  }

  assertPreapprovalMatchesCheckout(subscription, attempt);

  await ctx.runMutation(internal.mercadopagoCheckoutAttempts.complete, {
    checkoutReference: attempt.checkoutReference,
    preapprovalId: subscription.id,
    mpStatus: subscription.status ?? "pending",
    payerEmail: subscription.payer_email ?? attempt.payerEmail,
    reason: subscription.reason ?? plan.reason,
    amount: plan.amountCop,
    currencyId: MP_CURRENCY_ID,
    initPoint: subscription.init_point,
    nextPaymentDate: subscription.next_payment_date,
    remoteUpdatedAt: remoteTimestamp(subscription.last_modified),
  });

  return {
    initPoint: subscription.init_point,
    preapprovalId: subscription.id,
  };
}

async function applyRemotePreapproval(
  ctx: ActionCtx,
  preapprovalId: string,
  subscription: RemotePreapprovalState,
) {
  await ctx.runMutation(
    internal.mercadopagoSubscriptions.applyPreapprovalState,
    {
      preapprovalId,
      mpStatus: subscription.status ?? "pending",
      payerEmail: subscription.payer_email,
      reason: subscription.reason,
      nextPaymentDate:
        subscription.next_payment_date !== undefined
          ? String(subscription.next_payment_date)
          : undefined,
      remoteUpdatedAt: remoteTimestamp(subscription.last_modified),
    },
  );
}

/**
 * Refresh every locally open agreement from MercadoPago. Unknown/unreachable
 * remote state blocks checkout; only an exact remote `pending` is sweepable.
 */
async function reconcileOpenPaidRows(ctx: ActionCtx, userId: string) {
  const result: {
    rows: OpenPaidRow[];
    hasOverflow: boolean;
  } = await ctx.runQuery(
    internal.mercadopagoSubscriptions.listOpenPaidSubscriptions,
    { userId },
  );
  const abandonedPending: OpenPaidRow[] = [];
  let hasLiveSubscription = result.hasOverflow;

  for (const row of result.rows) {
    let remote: PreapprovalResponse;

    try {
      remote = await new PreApproval(mpConfig()).get({
        id: row.preapprovalId,
      });
    } catch (error) {
      console.error(
        `[mercadopago] no se pudo consultar el preapproval ${row.preapprovalId}`,
        error,
      );
      hasLiveSubscription = true;
      continue;
    }

    await applyRemotePreapproval(ctx, row.preapprovalId, remote);

    if (remote.status === "pending") {
      abandonedPending.push(row);
    } else if (!isTerminalStatus(remote.status)) {
      hasLiveSubscription = true;
    }
  }

  return { abandonedPending, hasLiveSubscription };
}

async function cancelRemotePreapproval(
  ctx: ActionCtx,
  userId: string,
  row: Pick<OpenPaidRow, "preapprovalId">,
) {
  let canceled: Awaited<ReturnType<PreApproval["update"]>>;

  try {
    canceled = await new PreApproval(mpConfig()).update({
      id: row.preapprovalId,
      body: { status: "cancelled" },
    });
  } catch (error) {
    console.error(
      `[mercadopago] no se pudo cancelar ${row.preapprovalId}`,
      error,
    );
    throw new ConvexError(
      "No pudimos confirmar la cancelación en Mercado Pago. No se creó ningún checkout nuevo.",
    );
  }

  if (!isTerminalStatus(canceled.status)) {
    throw new ConvexError(
      "Mercado Pago no confirmó la cancelación. No se creó ningún checkout nuevo.",
    );
  }

  await applyRemotePreapproval(ctx, row.preapprovalId, canceled);
  await ctx.runMutation(internal.mercadopagoCheckoutAttempts.clear, {
    userId,
    preapprovalId: row.preapprovalId,
  });
}

async function sweepAbandonedPending(
  ctx: ActionCtx,
  userId: string,
  rows: OpenPaidRow[],
) {
  for (const row of rows) {
    await cancelRemotePreapproval(ctx, userId, row);
  }
}

/** Reuse a safe pending link or clear a terminal/abandoned ready checkout. */
async function resolveReadyAttempt(
  ctx: ActionCtx,
  requestedProductKey: string,
  requestedPayerEmail: string,
  attempt: CheckoutAttempt,
) {
  if (
    attempt.state !== "ready" ||
    !attempt.preapprovalId ||
    !attempt.initPoint
  ) {
    return null;
  }

  let remote: PreapprovalResponse;
  try {
    remote = await new PreApproval(mpConfig()).get({
      id: attempt.preapprovalId,
    });
  } catch (error) {
    console.error(
      `[mercadopago] checkout ${attempt.checkoutReference} no verificable`,
      error,
    );
    throw new ConvexError(
      "No pudimos verificar tu checkout anterior. Inténtalo de nuevo más tarde.",
    );
  }

  assertPreapprovalMatchesCheckout(remote, attempt);
  await applyRemotePreapproval(ctx, attempt.preapprovalId, remote);

  if (remote.status === "pending") {
    if (
      attempt.productKey === requestedProductKey &&
      attempt.payerEmail === requestedPayerEmail
    ) {
      return {
        initPoint: attempt.initPoint,
        preapprovalId: attempt.preapprovalId,
      };
    }

    await cancelRemotePreapproval(ctx, attempt.userId, {
      preapprovalId: attempt.preapprovalId,
    });
    return null;
  }

  if (isTerminalStatus(remote.status)) {
    await ctx.runMutation(internal.mercadopagoCheckoutAttempts.clear, {
      userId: attempt.userId,
      preapprovalId: attempt.preapprovalId,
    });
    return null;
  }

  throw new ConvexError(
    "Ya tienes una suscripción abierta. Para cambiar de plan, primero cancélala desde tu perfil o desde tu cuenta de Mercado Pago.",
  );
}

export const createSubscriptionCheckout = zAuthAction({
  args: z.object({
    productKey: paidProductKeySchema,
    payerEmail: z.email().optional(),
  }),
  handler: async (ctx, args) => {
    const { userId } = ctx;
    const payerEmail =
      args.payerEmail ??
      (await ctx.runQuery(api.auth.getCurrentUser, {}))?.email;

    if (!payerEmail) {
      throw new ConvexError(
        "No se pudo determinar el correo del pagador para la suscripción.",
      );
    }

    for (let pass = 0; pass < 2; pass += 1) {
      const checkoutReference = crypto.randomUUID();
      const acquired: CheckoutAttempt = await ctx.runMutation(
        internal.mercadopagoCheckoutAttempts.acquire,
        {
          userId,
          productKey: args.productKey,
          payerEmail,
          checkoutReference,
          idempotencyKey: crypto.randomUUID(),
        },
      );

      if (acquired.state === "ready") {
        const existing = await resolveReadyAttempt(
          ctx,
          args.productKey,
          payerEmail,
          acquired,
        );
        if (existing) {
          return existing;
        }
        continue;
      }

      try {
        if (acquired.checkoutReference !== checkoutReference) {
          const recovered = await materializeSubscriptionCheckout(
            ctx,
            acquired,
          );
          const existing = await resolveReadyAttempt(
            ctx,
            args.productKey,
            payerEmail,
            {
              ...acquired,
              state: "ready",
              ...recovered,
            },
          );
          if (existing) {
            return existing;
          }
          continue;
        }

        const { abandonedPending, hasLiveSubscription } =
          await reconcileOpenPaidRows(ctx, userId);

        if (hasLiveSubscription) {
          await ctx.runMutation(internal.mercadopagoCheckoutAttempts.clear, {
            userId,
          });
          throw new ConvexError(
            "Ya tienes una suscripción abierta. Para cambiar de plan, primero cancélala desde tu perfil o desde tu cuenta de Mercado Pago.",
          );
        }

        await sweepAbandonedPending(ctx, userId, abandonedPending);
        return await materializeSubscriptionCheckout(ctx, acquired);
      } catch (error) {
        await ctx.runMutation(
          internal.mercadopagoCheckoutAttempts.releaseLease,
          { checkoutReference: acquired.checkoutReference },
        );
        throw error;
      }
    }

    throw new ConvexError(
      "No pudimos preparar el checkout. Inténtalo de nuevo.",
    );
  },
});

export const cancelSubscription = zAuthAction({
  args: z.object({}),
  handler: async (ctx) => {
    const { userId } = ctx;
    const target = await ctx.runQuery(
      internal.mercadopagoSubscriptions.getOpenPaidSubscription,
      { userId },
    );

    if (!target?.preapprovalId) {
      const current = await ctx.runQuery(
        api.mercadopagoSubscriptions.getMySubscription,
        {},
      );
      if (current?.productKey === MP_FREE_PRODUCT_KEY) {
        throw new ConvexError("No puedes cancelar el plan gratis.");
      }
      throw new ConvexError(errorMessages.notFound("suscripción"));
    }

    await cancelRemotePreapproval(ctx, userId, {
      preapprovalId: target.preapprovalId,
    });
    await ctx.runMutation(internal.mercadopagoSubscriptions.seedFree, {
      userId,
    });
    return { status: "cancelled" };
  },
});

/** Reconcile every paid agreement before activating the local free entitlement. */
export const subscribeFree = zAuthAction({
  args: z.object({}),
  handler: async (ctx): Promise<string> => {
    const { userId } = ctx;
    const attempt: CheckoutAttempt | null = await ctx.runQuery(
      internal.mercadopagoCheckoutAttempts.getForUser,
      { userId },
    );

    if (attempt?.state === "creating") {
      if (attempt.leaseExpiresAt > Date.now()) {
        throw new ConvexError(
          "Hay un checkout de pago en curso. Espera a que termine antes de activar el plan gratis.",
        );
      }

      await materializeSubscriptionCheckout(ctx, attempt);
    }

    if (attempt?.state === "ready") {
      await resolveReadyAttempt(ctx, MP_FREE_PRODUCT_KEY, "", attempt);
    }

    const { abandonedPending, hasLiveSubscription } =
      await reconcileOpenPaidRows(ctx, userId);
    if (hasLiveSubscription) {
      throw new ConvexError(
        "Tienes una suscripción de pago abierta. Cancélala antes de activar el plan gratis.",
      );
    }

    await sweepAbandonedPending(ctx, userId, abandonedPending);
    return await ctx.runMutation(
      internal.mercadopagoSubscriptions.activateFree,
      { userId },
    );
  },
});

export const createCreditCheckout = zAuthAction({
  args: z.object({
    productKey: creditProductKeySchema,
    barbershopId: z.string(),
  }),
  handler: async (ctx, args) => {
    const checkoutReference = crypto.randomUUID();
    const idempotencyKey = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + CREDIT_CHECKOUT_TTL_MS;
    const intent = await ctx.runMutation(
      internal.credits.createCheckoutIntent,
      {
        userId: ctx.userId,
        barbershopId: args.barbershopId,
        productKey: args.productKey,
        checkoutReference,
        idempotencyKey,
        expiresAt,
      },
    );

    const preference = await new Preference(mpConfig()).create({
      body: {
        items: [
          {
            id: intent.productKey,
            title: intent.title,
            description: intent.description,
            quantity: 1,
            unit_price: intent.amount,
            currency_id: intent.currencyId,
          },
        ],
        external_reference: intent.checkoutReference,
        notification_url: `${process.env.CONVEX_SITE_URL}/mercadopago/webhook`,
        binary_mode: true,
        expires: true,
        expiration_date_from: new Date(now - 60_000).toISOString(),
        expiration_date_to: new Date(expiresAt).toISOString(),
        back_urls: {
          success: `${siteUrl()}/profile?tab=plans&credits=success`,
          failure: `${siteUrl()}/profile?tab=plans&credits=failure`,
          pending: `${siteUrl()}/profile?tab=plans&credits=pending`,
        },
        auto_return: "approved",
      },
      requestOptions: { idempotencyKey: intent.idempotencyKey },
    });

    if (!preference.id || !preference.init_point) {
      throw new ConvexError(
        "Mercado Pago no devolvió un enlace de pago para los créditos.",
      );
    }

    await ctx.runMutation(internal.credits.completeCheckoutIntent, {
      checkoutReference,
      preferenceId: preference.id,
    });

    return { initPoint: preference.init_point, preferenceId: preference.id };
  },
});

/** Cancel every remotely open agreement before deleting the user's login. */
export const cancelUserBillingForDeletion = zInternalAction({
  args: z.object({ userId: z.string() }),
  handler: async (ctx, args) => {
    const hasPayableCreditCheckout = await ctx.runQuery(
      internal.credits.hasUnexpiredCheckoutForUser,
      { userId: args.userId, now: Date.now() },
    );
    if (hasPayableCreditCheckout) {
      throw new ConvexError(
        "Espera a que venza tu checkout de créditos antes de eliminar la cuenta.",
      );
    }

    const attempt: CheckoutAttempt | null = await ctx.runQuery(
      internal.mercadopagoCheckoutAttempts.getForUser,
      { userId: args.userId },
    );
    if (attempt?.state === "creating") {
      if (attempt.leaseExpiresAt > Date.now()) {
        throw new ConvexError(
          "No se puede eliminar la cuenta mientras se crea un checkout.",
        );
      }

      await materializeSubscriptionCheckout(ctx, attempt);
    }

    const open: { rows: OpenPaidRow[]; hasOverflow: boolean } =
      await ctx.runQuery(
        internal.mercadopagoSubscriptions.listOpenPaidSubscriptions,
        { userId: args.userId },
      );
    if (open.hasOverflow) {
      throw new ConvexError(
        "No se pudo verificar todo el historial de suscripciones.",
      );
    }

    for (const row of open.rows) {
      let remote: PreapprovalResponse;
      try {
        remote = await new PreApproval(mpConfig()).get({
          id: row.preapprovalId,
        });
      } catch (error) {
        console.error(
          `[mercadopago] no se pudo verificar ${row.preapprovalId} al borrar la cuenta`,
          error,
        );
        throw new ConvexError(
          "No pudimos confirmar la cancelación de tu suscripción. Tu cuenta no fue eliminada.",
        );
      }

      await applyRemotePreapproval(ctx, row.preapprovalId, remote);
      if (!isTerminalStatus(remote.status)) {
        await cancelRemotePreapproval(ctx, args.userId, row);
      }
    }
  },
});
