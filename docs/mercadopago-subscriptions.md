# Mercado Pago billing architecture

PanaBarbero uses Mercado Pago for recurring paid plans and one-time SMS or email credit packs. Convex owns checkout identity, authorization, plan limits, and entitlement state; a redirect or an authorized preapproval never grants access by itself.

Market: Colombia (`MCO`). Currency: Colombian pesos (`COP`). User-facing copy: Spanish (`es-CO`).

## Billing surfaces

Each billing layer has one responsibility:

| Surface | Canonical files | Responsibility |
| --- | --- | --- |
| Catalog | `convex/plans.ts`, `convex/mercadopagoPlans.ts` | Stable product keys, prices, intervals, credit packs, and plan limits |
| Subscription checkout | `convex/mercadopago.ts`, `convex/mercadopagoCheckoutAttempts.ts` | Durable checkout claim, hosted checkout creation, reconciliation, cancellation, and free-plan activation |
| Subscription entitlement | `convex/mercadopagoSubscriptions.ts` | Agreement state, approved payment periods, bounded reads, and the client-safe subscription result |
| Credit checkout | `convex/mercadopago.ts`, `convex/credits.ts` | Server-owned credit intent, Checkout Pro preference, grants, refunds, and chargebacks |
| Webhooks | `convex/http.ts`, `convex/mercadopagoWebhooks.ts` | Signature validation, remote resource fetches, catalog validation, and ordered state transitions |
| Client | `src/hooks/billing/use-mercadopago.ts`, `src/components/pricing/` | Pricing, redirect, pending state, cancellation confirmation, and plan management |

The billing tables are:

- `mercadopagoSubscriptions`: one row per remote preapproval, plus the local free entitlement
- `mercadopagoSubscriptionPayments`: one ordered lifecycle row per recurring payment
- `mercadopagoCheckoutAttempts`: one durable subscription checkout claim per user
- `mercadopagoCreditCheckouts`: immutable catalog terms for each credit checkout
- `creditPurchases`: one lifecycle record per Mercado Pago payment

## Plan catalog and limits

The server reads prices and limits from local catalogs. The client never submits an amount or grants its own access.

| Tier | Product keys | Invited barbers | Receptionists |
| --- | --- | ---: | ---: |
| Free (`free`) | `independiente` | 5 | 0 |
| Barbería (`pro`) | `barberiaMonthly`, `barberiaYearly` | 10 | 1 |
| Barbería Profesional (`premium`) | `barberiaProfMonthly`, `barberiaProfYearly` | Unlimited | 3 |

The free plan has no remote preapproval because Mercado Pago cannot charge a zero-value recurrence. `subscribeFree` reconciles every open paid agreement before creating the local entitlement.

## Subscription checkout lifecycle

The checkout action serializes creation per user and reuses one stable idempotency key for retries of the same intent:

1. `createSubscriptionCheckout` validates the paid product key and uses a validated payer email or the authenticated account email.
2. `mercadopagoCheckoutAttempts.acquire` atomically creates or resumes the per-user checkout claim.
3. The action fetches every locally open preapproval from Mercado Pago. An unreachable or unverified remote state blocks checkout.
4. The action cancels only remote preapprovals confirmed as abandoned and `pending`. Any live agreement blocks a second checkout.
5. `PreApproval.create` receives the server-owned reference, catalog amount, interval, currency, and the claim's stable idempotency key.
6. The completion mutation stores the preapproval and reusable hosted checkout URL in the same transaction.
7. The browser redirects to Mercado Pago. Returning to PanaBarbero shows a pending state until a payment webhook proves access.

Concurrent requests cannot create independent claims for the same user. Convex transaction conflicts serialize the indexed read and insert, while Mercado Pago deduplicates retries with the persisted idempotency key.

## Paid entitlement lifecycle

Agreement state and paid access are separate. A `subscription_preapproval` event may mark the agreement `authorized`, but it does not grant a paid plan.

Paid access requires both conditions:

- The normalized agreement status is `active`
- `paidThrough` is later than the current server time

Only a financially entitling authorized-payment invoice extends `paidThrough`. Approved and partially refunded payments keep the paid period; rejected or pending payments do not extend it. A full refund or unresolved chargeback against the payment that granted the current period revokes access, while a reimbursed chargeback restores it. The scheduled expiry mutation refreshes reactive clients when an unpaid period ends.

If a payment webhook is missed, the user can request reconciliation from the pricing card. The action fetches the authorized-payment page by preapproval, replays it oldest-first through the same validated idempotent recorder used by webhooks, and never grants access from agreement authorization alone.

Webhook reconciliation validates the stored preapproval id, checkout reference, product key, amount, currency, frequency, and frequency type against the server catalog. Remote timestamps prevent older events from overwriting newer agreement or payment state.

See Mercado Pago's [authorized payment lifecycle](https://www.mercadopago.com.co/developers/en/docs/subscriptions/integration-configuration/subscription-no-associated-plan/authorized-payments) for the provider-side payment model.

## Cancellation and plan changes

`cancelSubscription` changes the open preapproval to `cancelled` at Mercado Pago and verifies the returned terminal state before updating Convex. Cancellation is immediate: the paid entitlement stops because the agreement is no longer active, even if a prior `paidThrough` timestamp is still in the future.

Users must cancel the current paid agreement before choosing another paid plan or returning to Free. A paused or authorized agreement still blocks a new checkout because it can resume billing. The free plan cannot be cancelled.

Account deletion removes the WorkOS login before any irreversible billing cancellation. Convex snapshots and expires still-payable Checkout Pro preferences, retains the subscription provider identifiers, and retries remote cancellation with bounded backoff before deleting billing rows. The same idempotent cleanup runs whether deletion starts in the app or externally in WorkOS.

## One-time credit lifecycle

Only a barbershop owner can create a credit checkout. `credits.createCheckoutIntent` stores the barbershop, product key, credit count, amount, currency, checkout reference, and idempotency key before the action creates a Checkout Pro preference.

The Checkout Pro preference uses binary payment mode and expires after 30 minutes, so account deletion cannot orphan a pending, indefinitely payable link. The `payment` webhook fetches the payment from Mercado Pago and validates it against the immutable intent. An approved payment grants credits once. Cumulative partial refunds reduce the pack proportionally; full refunds and unresolved chargebacks remove the remaining unused portion. A reimbursed chargeback restores only credits that were actually removed, without duplicating credits already consumed.

## Configure each environment

Configure Mercado Pago variables in the matching Convex deployment. Test and production must use different Mercado Pago applications, access tokens, webhook secrets, and callback URLs.

| Variable | Required value |
| --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | Private seller token from the Mercado Pago application for this environment |
| `MERCADOPAGO_WEBHOOK_SECRET` | Signature secret from that application's webhook integration |
| `SITE_URL` | Public application origin used for checkout return URLs, for example `https://your_app.example` |

Convex provides `CONVEX_SITE_URL` automatically for each deployment; credit preferences append `/mercadopago/webhook` to that system URL. The hosted redirect flow does not require a client-side Mercado Pago public key. Idempotency keys are generated and persisted per checkout, so there is no static idempotency environment variable.

Register the same full webhook URL in the Mercado Pago application and enable these topics:

- `subscription_preapproval`: agreement authorization, pause, and cancellation
- `subscription_authorized_payment`: recurring invoice status and paid-period entitlement
- `payment`: credit-pack grants, refunds, and subscription payment reconciliation
- Chargebacks (`topic_chargebacks_wh` in webhook payloads): disputed payment reversal or restoration

The `payment` topic is required even when subscription topics are enabled because credit purchases use Checkout Pro payments. See Mercado Pago's [webhook configuration](https://www.mercadopago.com.co/developers/en/docs/subscriptions/additional-content/your-integrations/notifications/webhooks) and [chargeback notifications](https://www.mercadopago.com.co/developers/en/docs/checkout-pro/chargebacks/notifications).

## Verify a deployment

Run billing tests through `/pricing` or the **Planes** profile tab. There is no separate payer test route.

1. Configure the test Mercado Pago application, test credentials, full webhook URL, and all required topics.
2. Push the current Convex functions with `pnpx convex dev --once`.
3. Sign in with a PanaBarbero owner account and select a paid plan.
4. Complete the hosted checkout with a Mercado Pago test buyer from the matching test application.
5. Confirm the UI remains pending after authorization and becomes entitled only after an approved authorized-payment event.
6. Confirm a second checkout is blocked while the paid agreement is pending, authorized, or paused.
7. Cancel from the **Planes** tab and confirm access ends immediately.
8. Buy a credit pack and confirm one approved `payment` event grants it once.
9. Exercise a refund or chargeback in the test environment and confirm the available grant or entitlement is reversed.

Inspect webhook delivery in the Mercado Pago developer dashboard and billing state in the Convex data browser. Never copy access tokens, webhook secrets, real application ids, personal emails, or test-account passwords into this repository.

## Production invariants

Keep these rules intact when changing billing code:

- Never grant access from a redirect, a client argument, or preapproval authorization alone
- Never create a remote checkout before persisting its server-owned identity and idempotency key
- Never trust a webhook's mutable reference without matching a stored checkout and the local catalog
- Never fail open when remote agreement state cannot be verified
- Never allow a paid plan switch while an authorized, paused, pending, or unverified agreement may still bill
- Keep client subscription results free of payer emails, checkout URLs, provider ids, and internal document ids
