# WhatsApp-only channel: email + SMS as the silent double fallback

Status: drafted 2026-08-15 from three user requirements; D7 + Q1 answered 2026-08-17 (no compat, WhatsApp default ON). Builds on the uncommitted `feat/whatsapp-component` tree (P0 + P1 of `whatsapp-component-plan.md`). This plan is the "email/SMS purchase removal + channel retirement" follow-up that `whatsapp-component-plan.md` §5 named. It does NOT modify that plan; where it changes a detail (Twilio path stays; fallback is now unconditional email AND SMS) this file wins.

## 0. Requirements (verbatim intent)

1. `sendWhatsAppOrFallback` and related names are boilerplate-descriptive. Use short names (`sendNotification`, `sendWhatsApp`); split the fallback into its own function called from inside.
2. Email and SMS are no longer user-selectable channels. They are ONLY a fallback, fired when WhatsApp does not work (Meta API failure, local crash, bug). When WhatsApp fails, send the notification through email AND SMS.
3. Email and SMS are no longer purchasable. Only WhatsApp credits are sold. Remove the product cards and the enable/disable labels for email/SMS.

## 1. Decisions locked by this plan

| # | Decision | Outcome |
| --- | --- | --- |
| D1 | What "WhatsApp does not work" means | Both cases trigger the fallback: (a) **upfront ineligibility** — no consent, no phone, WhatsApp quota out, template not APPROVED; (b) **failure** — terminal Meta error, retries exhausted (transport/network/local throw), workflow could not start. Reason: guests (`user_does_not_exist`, `anon:*`) have no profile and can never consent; without (a) they would never get a reminder or a cancellation notice. This keeps `whatsapp-component-plan.md` decision 8 and widens (b) to crashes/bugs. |
| D2 | Fallback shape | Always email AND SMS, no per-channel preference. Email goes when an address exists (booking email → profile email); SMS goes when a phone exists (booking phone → profile phone). Missing address/phone = that leg is skipped silently. |
| D3 | Email/SMS metering | **Purchases and credits are removed.** The per-plan monthly allowances (`maxSmsPerMonth`, `maxEmailPerMonth`) STAY as invisible cost circuit breakers: guests fall back on every notification (steady SMS cost) and a Meta outage would fall back everything at once. Nothing about these caps is shown in the UI. When a cap is hit the leg is skipped (today's behavior); the in-app row is always written. |
| D4 | Preferences | Only the WhatsApp toggle remains (profile) + the booking-form consent checkbox. `updateNotificationPreference` accepts `whatsapp` only. No legacy `email`/`sms` entries survive (D7). |
| D5 | Naming | See §2. Short verbs, no "OrFallback"/"WithQuota"/"Delivery" suffixes. |
| D6 | Double delivery | Accepted. A network error after Meta accepted the message can retry (duplicate WhatsApp) and then still fall back (email+SMS). Deliverability wins over dedupe. |
| D7 | Legacy data | **No backwards compatibility.** The tree ends with the tight schema only: `extraCredits` = `barbershopId` + `whatsappCredits` + `whatsappPurchasedTotal` (required); `creditPurchases.type = z.literal("whatsapp")` and the MercadoPago-era optional fields go too (they only ever lived on `sms`/`email` rows, which are deleted; no reader exists); `notificationsPreferences[].type = z.literal("whatsapp")`. One migration `stripLegacyChannelData` (typed against the tight schema: `replace` for `extraCredits`, `delete` for non-WhatsApp purchases, `filter`+append for prefs) is run ONCE per deployment before the tight schema is pushed. Because Convex validates existing rows on push, the run needs a transient `schemaValidation: false` push (uncommitted, see Phase 4). Prod today: `extraCredits`/`creditPurchases` are empty; only `userProfileData` is touched. |
| D8 | Polar | `extraSms` / `extraEmails` product keys removed from `plans.ts` and `polar.ts`. A late `order.paid` for an archived product lands in PR #101's "unconfigured paid order" log path (no grant, no crash). |

## 2. Naming table

| Today | New | Where |
| --- | --- | --- |
| `sendWhatsAppOrFallback` | `sendNotification` | `convex/notifications.ts` (module-private) |
| `runFallbackDelivery` | `sendFallback` | `convex/notifications.ts` (module-private; called inside `sendNotification` and by the internal mutation below) |
| `runWhatsAppFallback` (internal mutation, called by workflows) | `runFallback` | `convex/notifications.ts` |
| `scheduleSmsWithQuota` / `scheduleEmailWithQuota` | `sendSms` / `sendEmail` | `convex/notifications.ts` (module-private; both keep the cap check from D3) |
| `serializeEmail` | `emailFallback` | `convex/notifications.ts` |
| `startWhatsAppSend` | `sendWhatsApp` | `convex/whatsapp.ts` |
| `WhatsAppFallback` (type) | `Fallback` | `convex/whatsapp.ts` |
| `sendTemplateWorkflow` | `sendWorkflow` | `convex/whatsapp.ts` |
| `isWhatsappLimitNotExceeded` etc. | unchanged | `convex/acl.ts` — pre-existing family, out of scope |
| `ExtraCreditsCards` | `WhatsAppCreditsCard` | `src/components/profile/whatsapp-credits-card.tsx` (file rename) |

`sendNotification` signature after the change (callers no longer compute `emailEnabled`/`smsEnabled`):

```ts
type Fallback = {
  barbershopId?: Id<"barbershops">;
  /** createFunctionHandle of an internal email action + args. Absent = no address. */
  email?: { handle: string; args: Record<string, unknown> };
  /** SMS body; `sendNotification` pairs it with `phone`. */
  smsBody?: string;
};

async function sendNotification(ctx, {
  barbershopId, phone, receiverProfile, template, fallback,
}): Promise<void>
```

Inside: eligible → `sendWhatsApp(...)` (workflow, fallback rides along); ineligible OR `sendWhatsApp` throws → `sendFallback(ctx, { ...fallback, phone })`.

## 3. Steps

Every step ends with a check. Do not start the next phase until the check passes.

### Phase 1 — send path (backend)

1. `convex/whatsapp.ts`
   - Rename `WhatsAppFallback` → `Fallback` (`email?`, `smsBody?`, `barbershopId?`, plus `phone: string` so the workflow can build the SMS). Update `fallbackValidator`.
   - Rename `startWhatsAppSend` → `sendWhatsApp`, `sendTemplateWorkflow` → `sendWorkflow`.
   - In `sendWorkflow`: wrap `step.runAction(sendTemplate)` in `try/catch`. Retries exhausted (transport/local throw) → `internal.notifications.runFallback` (D1-b). Keep: `ok:false` → fallback; `ok:true` → `recordWhatsAppSent`.
   - Header comment: state D1/D2/D6 in two sentences.
   - Check: `pnpm exec tsc --noEmit -p convex` (expect errors only in callers, fixed in step 2).
2. `convex/notifications.ts`
   - Delete `isNotificationEnabled`, `isCustomerEmailEnabled`. Keep `isWhatsAppEnabled` (consent gate).
   - `scheduleSmsWithQuota` → `sendSms(ctx, {to, body, barbershopId})`; `scheduleEmailWithQuota` → `sendEmail(ctx, barbershopId, send)`. Behavior unchanged (cap check + counter).
   - `runFallbackDelivery` → `sendFallback(ctx, fallback & {phone})`: email leg when `fallback.email`, SMS leg when `fallback.smsBody && phone`.
   - `runWhatsAppFallback` → `runFallback` (args: the new `Fallback` + `phone`).
   - `sendWhatsAppOrFallback` → `sendNotification` per §2. Wrap the `sendWhatsApp` call in `try/catch` → `sendFallback` (D1-b).
   - `serializeEmail` → `emailFallback`.
   - Rewrite every caller (`createAppointmentCancelled`, `createAppointmentRescheduleRequest`, `createAppointmentRescheduleDecision`, `createAppointmentCreated` (both sides), `createAppointmentReminder`, `createPastAppointmentReminder`, `createBarberRemovedCancellation`, `createServiceDeletedCancellation`, `createServiceLineRemoved`, `createAppointmentReassigned`, `createReviewInvite`): remove `emailEnabled`/`smsEnabled`, pass `fallback: { barbershopId, email: to ? await emailFallback(ref, args) : undefined, smsBody }`. Phone resolution stays booking-phone-first (`||`).
   - `createReviewInvite`: still no email leg (no template exists) — comment stays.
   - Check: `tsc -p convex` clean; `grep -n "isNotificationEnabled\|smsEnabled\|emailEnabled\|OrFallback\|WithQuota" convex/` returns nothing.
3. `convex/inventoryAlerts.ts` — single send path
   - `prepareLowStockAlert` no longer returns `emails` / `smsTargets` / `whatsappSends`; per recipient it calls `sendNotification` (template = low-stock builder, fallback = `emailFallback(internal.emails.sendLowStockEmail, {...})` + `smsBody`), plus `recordInApp`.
   - `lowStockAlert` workflow becomes redundant (all fan-out is inside `sendNotification` → `sendWorkflow`). Rename `prepareLowStockAlert` → `sendLowStockAlert` (internal mutation, same args) and make `startLowStockAlert` (the only trigger, called twice from `convex/inventory.ts`) do `ctx.scheduler.runAfter(0, internal.inventoryAlerts.sendLowStockAlert, input)` — this keeps the deferral the original design wanted (the inventory mutation only enqueues). Delete the workflow. Remove the now-unused imports (`isEmailLimitNotExceeded`, `incrementEmailSent`, `start`, `defineWorkflow`, …).
   - Check: `tsc -p convex`; `pnpx convex dev --once` pushes.
4. `convex/userProfileData.ts`
   - `DEFAULT_NOTIFICATION_PREFERENCES` → `[{ type: "whatsapp", enabled: true }]` (Q1: WhatsApp is the default channel). Profile creation (`auth.ts` ~L315, `barbershops.ts` ~L90) also stamps `whatsappOptedInAt: Date.now()` so the consent record matches the enabled flag.
   - `updateNotificationPreference` args: `type: z.literal("whatsapp")`. `upsertNotificationPreference` param type narrows the same way (keep the append-when-missing logic — defensive for rows the migration has not seen).
   - Schema (`convex/schema.ts`): `notificationsPreferences[].type: z.literal("whatsapp")` now (D7).
   - Check: `tsc -p convex`.
5. Smoke test on dev with `npx convex run` (same technique as P1):
   - Registered customer with WhatsApp OFF + booking email + phone: trigger `notifications:createAppointmentReminder` → expect ONE `emails.*` scheduled + ONE `twilio.sendSms` scheduled (dashboard "Scheduled functions"), in-app row written.
   - Same customer WhatsApp ON, expired token (dev token IS expired): expect the workflow to fail the step, then `runFallback` runs → email + SMS both scheduled. This is the D1-b proof.
   - Guest appointment (`user_does_not_exist`) → fallback both legs.
   - Shop over `maxSmsPerMonth` (set `usage.smsSent` = cap via `pnpx convex data`… or lower the cap on a test tier temporarily, then restore) → email only. Restore the row after.

### Phase 2 — billing (backend)

6. `convex/plans.ts`: `CREDIT_PRODUCT_KEYS = ["extraWhatsApp"]`; `CREDITS_PER_PURCHASE` / `CREDIT_KEY_TO_TYPE` keep only that key. `maxSmsPerMonth` / `maxEmailPerMonth` STAY (D3). Add a comment on both: "internal fallback cap, not shown, not purchasable".
7. `convex/polar.ts`: drop `POLAR_PRODUCT_EXTRA_SMS` / `POLAR_PRODUCT_EXTRA_EMAIL` entries (map is keyed by `CREDIT_PRODUCT_KEYS`, so indexes shift — use the key names, not `[0]/[1]/[2]`, to make this class of edit safe).
8. `convex/credits.ts`
   - `addPurchasedCredits`: whatsapp branch only; the insert path writes `whatsappCredits`/`whatsappPurchasedTotal` only. Arg `type` narrows to `z.literal("whatsapp")` (the `order.paid` caller passes `CREDIT_KEY_TO_TYPE[key]`, which is now always `"whatsapp"`).
   - `getMyExtraCredits`: return whatsapp fields only.
   - `getBarbershopQuotaUsage`: return `whatsappUsed` / `maxWhatsAppPerMonth` only.
   - Check: grep `smsCredits|emailCredits|smsPurchasedTotal|emailPurchasedTotal` in `convex/` → only `schema.ts` (legacy optional) and `acl.ts` credit-decrement branches (next bullet).
9. `convex/acl.ts`: `incrementSmsSent` / `incrementEmailSent` no longer decrement credits (there are none); the `isSmsLimitNotExceeded` / `isEmailLimitNotExceeded` return `row.smsSent < cap` only. Keep counters + `usageTriggers` (aggregates untouched — dead readers, out of scope; flag in the summary).
10. `convex/schema.ts` (D7): `extraCredits` keeps only `barbershopId`, `whatsappCredits`, `whatsappPurchasedTotal` (all required); `creditPurchases` = `orderId` (required), `barbershopId`, `type: z.literal("whatsapp")`, `amount`, `purchasedAt` (required) — MP-era optionals removed; comment updated.
11. `convex/migrations.ts`: add three `migrations.define` (one per table, chained with `migrations.runner([...])` as `stripLegacyChannelData`): `extraCredits` → `ctx.db.replace(row._id, { barbershopId, whatsappCredits: row.whatsappCredits ?? 0, whatsappPurchasedTotal: row.whatsappPurchasedTotal ?? 0 })`; `creditPurchases` → delete rows whose `type !== "whatsapp"`; `userProfileData` → keep only the `whatsapp` entry, append `{ whatsapp, enabled: true }` + stamp `whatsappOptedInAt` when missing (Q1). Typed against the tight schema (see D7).
12. `src/hooks/billing/use-plan.ts`: drop `maxSmsPerMonth` from the public limits payload (both branches). Check with `tsc -p .` which UI reads it (billing-plan-card).
   - Check: `tsc -p convex && tsc -p .` clean; `pnpx convex dev --once`.

### Phase 3 — UI + copy

13. `src/components/profile/extra-credits-cards.tsx` → `whatsapp-credits-card.tsx`, export `WhatsAppCreditsCard`. One card, keyed `products.extraWhatsApp`; `planQuotaKind` prop removed (labels are constants: "Mensajes de WhatsApp incluidos", "Mensajes de WhatsApp extra restantes"). Grid wrapper goes (single card, `max-w-md`).
14. `src/routes/_authedRoutes/profile/barbershops/settings/billing/index.tsx`: import rename; section description → "Compra mensajes de WhatsApp adicionales cuando agotes los incluidos en tu plan. Los créditos no vencen."; Suspense skeleton = one card.
15. `src/components/barbershops/settings/billing-plan-card.tsx`: remove the "SMS mensuales" and "Emails mensuales" rows and their skeleton keys; keep "Mensajes de WhatsApp".
16. `src/components/profile/account-tab.tsx`: remove the Email and SMS `FieldRoot`s. Card copy → title "Avisos por WhatsApp", description "Recibe los avisos de tus citas por WhatsApp. Si WhatsApp falla, te avisamos por correo y SMS." (honest about D2; keeps the personality: direct, no marketing).
17. `src/hooks/use-profile.ts`: optimistic update stays generic (it keys on `args.type`); only the arg type narrows via `api` types. No edit expected — verify with `tsc -p .`.
18. `src/components/appointments/customer-booking-form.tsx`: unchanged (WhatsApp checkbox is the consent surface). Verify only.
19. Docs (AGENTS.md rule: keep `ARCHITECTURE.md` current):
   - `ARCHITECTURE.md` ~§237 owner row: "one-time SMS/email credit packs" → "one-time WhatsApp credit pack".
   - `docs/user-flow.md` L88-89 (email/SMS toggles) and `docs/barber-owner-flow.md` L184 (SMS/email metering) → WhatsApp wording + "email/SMS = fallback only".
   - Legal copy: `grep -in "sms\|correo" src/routes/tos.tsx src/routes/privacy-policy.tsx` — only reword if a sentence promises channel *choice*.
   - Check: `pnpm lint` on touched files; `pnpm doctor:diff` (baseline: `use-profile.ts:26` false positive only); `pnpm build` exit 0.
20. Browser verification (agent-browser via the CF tunnel, persona `pb-owner`, see ARCHITECTURE.md §4 / memory `browser-review-workflow`):
   - `/profile` account tab → only the WhatsApp switch; toggling it round-trips.
   - `/profile/barbershops/settings/billing` → plan card shows no SMS/Email rows; "Créditos extra" shows one WhatsApp card; checkout link opens (sandbox).
   - No console errors, no hydration mismatch.

### Phase 4 — data strip (dev now, prod at release)

21. Convex validates existing rows against the schema on every push, so the tight schema cannot land while legacy rows exist. Procedure (no code compat, one transient local edit):
    1. Locally set `schemaValidation: false` in `defineSchema` (do NOT commit) → `pnpx convex dev --once`.
    2. `npx convex run migrations:stripLegacyChannelData` (dev). Verify with `pnpx convex data extraCredits` / `creditPurchases` / `userProfileData`.
    3. Revert the flag → `pnpx convex dev --once` must push (validates the stripped rows).
22. Prod release: same three moves with `--prod`; prod `extraCredits`/`creditPurchases` are already empty, only profiles change. Put the commands in the PR body.

## 4. Final verification (definition of done)

- `pnpm exec tsc --noEmit -p convex` and `-p .` → 0 errors; `pnpm test` green (no new tests needed: the fallback logic is Convex-coupled; the pure codec/template tests already cover the templates).
- `grep -rn "sendWhatsAppOrFallback\|runFallbackDelivery\|runWhatsAppFallback\|scheduleSmsWithQuota\|scheduleEmailWithQuota\|startWhatsAppSend\|WhatsAppFallback\|isNotificationEnabled\|extraSms\|extraEmails\|ExtraCreditsCards" convex src` → nothing (outside `_generated`).
- Dev smoke of §3 step 5 (four cases) recorded in the PR body with the scheduled-function ids.
- Browser pass of step 20.
- `pnpm build` exit 0.

## 5. Out of scope (do not touch)

- Twilio and useSend senders (`convex/twilio.ts`, `convex/emails.ts`) — they stay as fallback transports.
- `smsUsageAggregate` / `emailUsageAggregate` and their components — no readers; delete in a later cleanup, not here.
- WhatsApp allowances, credits, metering, templates, inbound handlers, consent checkbox — unchanged (`whatsapp-component-plan.md` P0/P1).
- Polar plan-benefit chips and product descriptions that mention SMS/emails — dashboard-only (no benefits API), user-owned (§6).
- Lane 2 (Pana over WhatsApp).

## 6. User-owned ops (outside the repo)

1. Polar: archive "1000 Correos Extra" in prod (SMS/email packs are already archived in sandbox since 2026-08-12); remove SMS/email benefit chips from plan descriptions in both catalogs; keep the WhatsApp pack.
2. Convex env: unset `POLAR_PRODUCT_EXTRA_SMS` and `POLAR_PRODUCT_EXTRA_EMAIL` on dev and prod after Phase 2 lands (they become unread; `syncExistingProducts` will stop logging them as missing only once the keys are gone from `plans.ts`).
3. Still open from `whatsapp-component-plan.md` §5/§6: rotate `WHATSAPP_ACCESS_TOKEN`, Meta template batch, business verification, prod Polar env vars.
4. **Fix `WHATSAPP_WABA_ID` on dev** (checked 2026-08-17): both `WHATSAPP_ACCESS_TOKEN` and `WHATSAPP_WABA_ID` hold the *identical* string, and Meta `debug_token` confirms it is a valid, non-expiring `SYSTEM_USER` token with the three `whatsapp_business_*` scopes — so the token field is correct and nothing needs reverting. Only `WHATSAPP_WABA_ID` is wrong. The Graph API does not expose the id to this token (`me/assigned_whatsapp_business_accounts` is empty; the WABA is app-owned) — copy the numeric "WhatsApp Business Account ID" from Meta App Dashboard → WhatsApp → API Setup and `pnpx convex env set WHATSAPP_WABA_ID <id>`. `syncTemplates` fails until then.

## 7. Answered questions

- **Q1 — WhatsApp default for new profiles: ON** (user decision 2026-08-17). WhatsApp is the default notification channel; `whatsappOptedInAt` is stamped at profile creation and by the migration for existing profiles.
- **D7 — no backwards compatibility** (user decision 2026-08-17): see D7 + Phase 4.

## 8. Execution log (2026-08-17)

Implemented on `feat/whatsapp-component` (uncommitted). Deviations / notes:

- `sendNotification` takes flat `email` + `smsBody` (no nested `fallback` object at call sites); the serialized `Fallback` = `{ barbershopId?, phone?, smsBody?, email? }`. `sendNotification` and `emailFallback` are exported (inventory alerts use them).
- `createAppointmentCreated` customer side: template stays `null` (decision 10 of the WhatsApp plan) → `sendNotification` runs the fallback, so the customer confirmation still arrives by email + SMS (self-booked and staff-created) with no special case.
- `inventoryAlerts.lowStockAlert` workflow deleted; `startLowStockAlert` → `scheduler.runAfter(0, sendLowStockAlert)`.
- `PlansTab` (profile → Planes) also rendered `ExtraCreditsCards` — rewired to `WhatsAppCreditsCard`.
- `stripLegacyChannelData` is a `migrations.runner([...])` series → run with `npx convex run migrations:stripLegacyChannelData` (no `{fn}` arg). Dev: ran on 2026-08-17 (2 `extraCredits` rows replaced, all `creditPurchases` deleted, all profiles → `[{whatsapp, enabled: true}]`), then the tight schema pushed with validation on.
- Smoke (dev, `createAppointmentReminder`): guest → 1 SMS; registered + WhatsApp ON + no approved template → email + SMS; registered + fake APPROVED row + non-allow-listed number → Meta `131030` (terminal) → `runFallback` → email + SMS (D1-b proof; fake template row removed after). The cap case (§3 step 5, 4th) was NOT run — cap logic is unchanged code. Twilio returns 401 on dev (dev creds; pre-existing) — the leg being scheduled is the assertion.
- Gates: `tsc` (convex + root) clean, `pnpm test` 15/15, `pnpm build` exit 0, `pnpm doctor:diff` = baseline only, biome clean on touched files (3 pre-existing `useReactCompiler` warnings in untouched `account-tab.tsx` lines). Browser (pb-owner via CF tunnel): account tab shows only the WhatsApp switch and round-trips; billing shows no SMS/Email rows and one WhatsApp card; no console errors.
- Flagged, not done (outside plan): marketing copy still says "SMS y correo" — `src/config/home-faqs.ts`, `src/components/landing/module-sections.tsx`, `landing-sim.ts`, `src/lib/utils.ts:315` (JSON-LD), `src/routes/llms[.]txt.ts`, `src/routes/ai.tsx`. Polar sandbox WhatsApp pack description reads "Adquiere SMS extra…" (dashboard edit, §6). `POLAR_PRODUCT_EXTRA_SMS/EMAIL` still set on dev (§6.2). `WHATSAPP_WABA_ID` still wrong (§6.4).
