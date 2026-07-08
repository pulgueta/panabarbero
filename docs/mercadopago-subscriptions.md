# MercadoPago Subscriptions — parallel integration (test)

A complete MercadoPago **Subscriptions (Preapproval)** integration that runs
**in parallel to Polar**. Nothing about the live Polar path is touched; this is a
self-contained stack that could replace Polar for every subscription-related
concern with a one-line swap (see [Swapping Polar → MercadoPago](#swapping-polar--mercadopago)).

Market: Colombia (`MCO`), currency `COP`, copy in Spanish (es-CO).

---

## What was built

| Layer | File | Purpose |
| --- | --- | --- |
| Plan catalog (pure TS) | `convex/mercadopagoPlans.ts` | `productKey` → `{ tier, interval, amountCop, frequency, reason }`, status normalizer. Mirrors Polar amounts; reuses tiers from `convex/plans.ts`. |
| Schema | `convex/schema.ts` → `mercadopagoSubscriptions` | One row per subscription. Indexes `by_userId`, `by_preapprovalId`. |
| DB layer + resolver | `convex/mercadopagoSubscriptions.ts` | `getCurrentMpSubscription` (ACL-shaped), `upsertByPreapproval`, `subscribeFree`, `getMySubscription`. |
| SDK actions (`"use node"`) | `convex/mercadopago.ts` | `createSubscriptionCheckout`, `cancelSubscription`, `processWebhookEvent`. Uses the official `mercadopago` Node SDK. |
| Webhook route | `convex/http.ts` → `POST /mercadopago/webhook` | Additive; forwards to `processWebhookEvent`. Does **not** touch the Polar routes. |
| Client hooks | `src/hooks/billing/use-mercadopago.ts` | Reactive subscription query + checkout/cancel/free mutations. |
| Test surface | `src/routes/mercadopago.tsx`, `src/components/mercadopago/` | `/mercadopago` page: plan cards, current status, subscribe (redirect), cancel. |

All server functions use the project's Zod wrappers (`zAuthAction`,
`zAuthMutation`, `zInternalAction`, `zInternalMutation`, `zQuery`) and Zod
schemas via `zodTable`.

---

## Checkout model — why "preapproval without a plan, pending"

MercadoPago offers two subscription models:

1. **With an associated plan** (`preapproval_plan` template + subscribers). The
   hosted plan link works, **but the resulting subscriber cannot carry our
   `external_reference`**, so a webhook cannot be mapped back to a PanaBarbero
   `userId`. (Creating a subscriber against a plan via API additionally requires
   a `card_token_id` — i.e. client-side PCI card tokenization — and status
   `authorized`.)
2. **Without a plan, created as `pending`** ← **what we use.** We set
   `external_reference = "<userId>|<productKey>"` and `payer_email` ourselves,
   MercadoPago returns an `init_point` hosted-checkout URL, and the buyer picks a
   payment method there. This mirrors Polar's hosted-checkout redirect, needs no
   card tokenization on our side, and keeps the webhook → user mapping intact.

The free tier (`independiente`, $0) never hits MercadoPago — it is a local row
written by `subscribeFree` (MercadoPago cannot bill a $0 recurrence). This still
satisfies `assertIsSubscribed`, exactly like a Polar free subscription.

### Lifecycle

```
UI "Suscribirse"
  └─ createSubscriptionCheckout (zAuthAction)
       ├─ PreApproval.create({ status:"pending", auto_recurring, external_reference, payer_email, back_url })
       ├─ upsertByPreapproval → row { status:"pending" }
       └─ returns init_point
  └─ browser redirect → MercadoPago hosted checkout
       └─ buyer authorizes with a card
            └─ MercadoPago → POST /mercadopago/webhook  (type: subscription_preapproval)
                 └─ processWebhookEvent: validate x-signature → PreApproval.get(id)
                      └─ upsertByPreapproval → row { status:"active" }  (mpStatus "authorized")
```

Status mapping (`normalizeMpStatus`): `authorized → active`, `pending → pending`,
`paused → paused`, `cancelled → canceled`. The normalized `status` uses the same
vocabulary the ACL already gates on (`active`/`trialing`).

---

## Environment variables (Convex dashboard)

| Variable | Status | Notes |
| --- | --- | --- |
| `MERCADOPAGO_ACCESS_TOKEN` | ✅ set (`TEST-…`) | Seller token. Used by every SDK call. |
| `MERCADOPAGO_PUBLIC_KEY` | ✅ set (`TEST-…`) | **Not required** for the redirect flow (only needed if we ever add client-side card tokenization). |
| `MERCADOPAGO_WEBHOOK_SECRET` | ✅ set + verified | Signature secret for the app. A real `subscription_preapproval` webhook from MercadoPago was delivered and returned **HTTP 200** (signature validated), confirming the stored secret matches MercadoPago's signing secret. Without it, `processWebhookEvent` returns 500 and access never flips to `active`. |
| `MERCADOPAGO_IDEMPOTENCY_KEY` | set, unused | We generate a fresh idempotency key per `create` call (`crypto.randomUUID()`), which is the correct behavior; a single static key would collapse distinct subscriptions. |

The webhook has already been registered on the **PanaBarbero** app
(`944815793526367`):

- URL (prod + sandbox): `https://grandiose-sturgeon-51.convex.site/mercadopago/webhook`
- Topics: `subscription_preapproval`, `subscription_authorized_payment`
- Secret: starts with `08faf84…` — **reveal the full value** at
  `developers/panel/app/944815793526367/webhooks` and set it as
  `MERCADOPAGO_WEBHOOK_SECRET`.

```sh
pnpx convex env set MERCADOPAGO_WEBHOOK_SECRET "<full-secret-from-dashboard>"
```

---

## Manual testing guide

### 0. One-time setup

1. Reveal the webhook secret (above) and `convex env set MERCADOPAGO_WEBHOOK_SECRET`.
2. Make sure Convex has the latest functions pushed (`pnpx convex dev --once` or `pnpm dev`).
3. Start the app (`pnpm dev`) and open **`/mercadopago`** while logged in.

### 1. Credentials you need

| What | Value / where |
| --- | --- |
| Seller token | Already in Convex (`MERCADOPAGO_ACCESS_TOKEN`). |
| Webhook secret | Dashboard → app `944815793526367` → Webhooks → reveal. Set in Convex. |
| **Test buyer** | `TESTUSER8236605759905604647` (user id `3524783609`). Password: dashboard → app → **Test accounts**, or `https://www.mercadopago.com.co/developers/panel/app/4533703913087261/test-users`. Balance loaded. |

> If you need to (re)generate or reveal a credential, paste it here and I can wire
> it in. Never commit these — they stay in the Convex dashboard.

### 2. MCO test card (use at the hosted checkout)

| Type | Number | CVV | Exp | Cardholder | Doc |
| --- | --- | --- | --- | --- | --- |
| Visa credit | `4013 5406 8274 6260` | `123` | `11/30` | `APRO` (approved) | `123456789` |
| Mastercard credit | `5254 1336 7440 3564` | `123` | `11/30` | `APRO` | `123456789` |

Change the cardholder name to force other outcomes: `OTHE` (declined),
`CONT` (pending), `FUND` (insufficient funds), etc.

### 3. Happy path

1. On `/mercadopago`, optionally type a **payer email** into the field.
   - Use a normal email (e.g. a Gmail). **Do not use an `@testuser.com`
     address** — MercadoPago returns a 500 for those on preapproval creation.
   - Leave it blank to use your account email (must differ from the seller
     account email `retardix456@gmail.com`).
2. Click **Suscribirse** on a paid plan → you're redirected to
   `mercadopago.com.co/subscriptions/checkout?preapproval_id=…`.
3. Log in there as the **test buyer** and pay with the `APRO` test card.
4. You return to `/mercadopago?status=success` (banner: "Estamos confirmando tu
   pago…"). The subscription card flips **Pendiente → Activa** automatically once
   the `subscription_preapproval` webhook lands (usually seconds).
5. **Cancel** with the "Cancelar suscripción" button → MercadoPago status
   `cancelled`, local status `Cancelada`.
6. **Free plan**: "Activar plan gratis" writes a local `active` row with no
   MercadoPago call.

### 4. Verifying without the UI

```sh
# Inspect stored rows
pnpx convex data mercadopagoSubscriptions --limit 10

# Drive the checkout action as any user (impersonation)
pnpx convex run mercadopago:createSubscriptionCheckout \
  '{"productKey":"barberiaMonthly","payerEmail":"comprador_prueba@gmail.com"}' \
  --identity '{"subject":"user_test01","issuer":"https://t","name":"T"}'

# Resolve the effective subscription for that user
pnpx convex run mercadopagoSubscriptions:getMySubscription '{}' \
  --identity '{"subject":"user_test01","issuer":"https://t","name":"T"}'
```

Webhook delivery health: dashboard → app → Webhooks, or the MCP
`notifications_history` tool.

> A smoke-test row (`userId: "user_smoketest01"`, status `pending`) exists in the
> **dev** deployment from validation. Harmless (fake user); delete it from the
> Convex data browser if you want a clean slate.

---

## Swapping Polar → MercadoPago

The integration is a drop-in because `getCurrentMpSubscription(ctx, userId)`
returns the same `{ productKey, status }` shape the ACL reads from
`polar.getCurrentSubscription`. To make MercadoPago authoritative **without
removing Polar**, change three call sites:

- `convex/acl.ts` → `getSubscription` : call `getCurrentMpSubscription(ctx, userId)`.
- `convex/auth.ts` → `getUserSubscription` and `getBarbershopOwnerSubscription` :
  same substitution.

Everything downstream (`getTierForProductKey`, `getLimitsForProductKey`,
`PLAN_LIMITS`, all `assert*` guards, the client `usePlan` hook) is provider-
agnostic and needs no changes, because both providers speak the same
`productKey` vocabulary from `convex/plans.ts`.

For the client, `api.mercadopagoSubscriptions.getMySubscription` mirrors
`api.auth.getUserSubscription`, so the pricing/settings UI can point at either.

---

## Known caveats / follow-ups

- **`payer_email` domain**: `@testuser.com` addresses 500 on preapproval
  creation. Use real-looking emails.
- **One effective subscription per user**: the resolver picks the highest-
  priority row (`active > trialing > paused > pending > canceled`). Switching
  plans creates a new preapproval; the old one should be canceled (the "Cancelar"
  button, or a future auto-cancel-on-switch step).
- **Recurring-payment webhooks** (`subscription_authorized_payment`) are received
  and signature-checked but currently ignored — access is driven entirely by the
  preapproval status. Wire them up if you want per-invoice records.
- **Proration / plan changes / free trials**: not implemented (Polar parity is
  tier-gating only).
