# WhatsApp notifications

Status: decisions locked 2026-08-12 after a full grill with docs verification. Supersedes the v2 plan that lived at the repo root. Sources of truth used: the six WhatsApp Manager template screenshots, current Meta Cloud API docs (fact-checked live), the Polar catalogs (Sandbox + Production), `convex-whatsapp@1.1.5` package source, and git prior art (`origin/convex-whatsapp`, local `whatsapp-component`).

## 1. Locked decisions

| # | Decision | Outcome |
| --- | --- | --- |
| 1 | Tenancy | One PanaBarbero-branded number/WABA for all shops (component constraint accepted; no multi-number indirection) |
| 2 | Consent | Booking-form checkbox where `contactPhone` is typed + profile toggle; `whatsappOptedInAt` stamped; default OFF; owners/staff opt in via profile. No silent enable, no Lineage-B opt-out default |
| 3 | Inbound | Lane 1 (deterministic buttons) only. Free text gets one canned reply per 24h session. Pana-over-WhatsApp (Lane 2) = separate future plan |
| 4 | Meta submissions | One batch: edit `appointment_reschedule_request_customer` in place (add QR "Rechazar cambio") + all new barber/P1 templates. Safe only while the channel is dark — post-launch edits must use versioned copies (edited templates go dark during re-review) |
| 5 | Inventory ack | Implement "Ya hice el pedido": field on inventory level + phone-authed internal mutation, payload bound to the alert timestamp, suppresses re-alerts until stock recovers |
| 6 | CTA links | Stay static (`/profile?tab=appointments`, `/profile/barbershops/inventory`). R9 (`SITE_URL`) does not affect WhatsApp CTAs — URLs are baked into templates |
| 7 | Channels | **WhatsApp is THE notification channel.** Email/SMS are fallback-only; email/SMS credit purchases are removed shortly (separate cleanup). Replaces v2 §0.3 ("additive third channel") |
| 8 | Fallback trigger | Upfront ineligibility (no consent, no phone, quota out, template unavailable) + synchronous send errors only. Async losses accepted (TTL expiry has NO webhook). Quota-out also prompts a pack purchase |
| 9 | Metering | Every template send counts, one counter, decrement AFTER the component send call succeeds. Replies/interactive messages never count |
| 10 | Created-customer send | DROPPED (redundant with on-screen confirmation). Template stays approved but unsent. ~4 sends per completed cita |
| 11 | Pricing | Allowances 200 / 2000 / 6000 per month; pack = 3000 credits @ COP 30,000 (USD 7.50). Verified below market by 5–20× (AgendaPro COP 200/msg, Fresha COP 50–230/msg); ~55% pack margin after Polar fees |
| 12 | Cancel path | Cut this pass — no WhatsApp cancel; in-app via CTA. Revisit with no-show data (versioned reminder-template edit later) |
| 13 | Graph pin | pnpm-patch `convex-whatsapp`'s Graph v18.0 pin to v26 at integration (v18 retired Jan 2026; silent jump to v21 semantics Sept 24, 2026) |

## 2. Verified template inventory (screenshots, session 89fa1e75)

All six templates: **Utility • Spanish (COL)** → sends MUST use language `es_CO` (valid code since the LatAm expansion; wrong language fails with error 132001). `WHATSAPP_TEMPLATE_LANGUAGE=es` on the deployment is stale.

| Template | Vars | Buttons | Notes |
| --- | --- | --- | --- |
| `appointment_created_customer` | body 6: name, shop, date, time, barber, service | CTA "Ver mi cita" + QR "Necesito reagendar" + QR "Cancelar cita" | **Not sent** (decision 10). Keep approved |
| `appointment_reminder_customer` | body 5: name, time, shop, service, barber | CTA "Ver mi cita" + QR "Voy en camino" | Copy hardcodes "hoy" — correct, main fires it at T−30 min. Set explicit TTL (12h) |
| `appointment_reschedule_request_customer` | body 6: name, shop, old date, old time, new date, new time | CTA "Revisar cambio" + QR "Aceptar cambio" | Edit: add QR "Rechazar cambio" (decision 4) |
| `appointment_cancelled` | header 1: shop; body 3: name, shop, reason | none | Only template with a header variable — wrapper must support header params. Reused for barber/service cancellation kinds |
| `review_invite_customer_v1` | body 3: name, shop, service | QR "Calificar visita" | Slug has the `_v1` suffix (v2 plan had it wrong). References the specific visit → safely UTILITY |
| `inventory_low_stock` | body 5: item, shop, qty, unit, reorder point | CTA "Revisar inventario" + QR "Ya hice el pedido" | Ack flow implemented (decision 5) |

New templates for the batch: `appointment_created_barber`, `appointment_reschedule_request_barber` (accept AND reject QRs), `appointment_reschedule_resolved`, `past_appointment_reminder_barber` (QRs "Completada"/"No asistió"; send-side suppresses "Completada" when any line has `priceType: "starting"`), `appointment_service_removed_customer`, `appointment_reassigned_customer`.

## 3. Docs-verified facts that bind the implementation

- Quick-reply payloads are per-send; max length is NOT documented (128 is folklore) and omitted-payload behavior (label as payload) is BSP folklore — always pass explicit payloads and integration-test the four inbound shapes.
- Buttons: ≤10 total, quick replies must be contiguous; our shapes are valid.
- Template edits: re-review on any component edit; PENDING = cannot send; 10 edits/30 days, 1/24h.
- Interactive list (rating flow): ≤10 rows, row id ≤200 chars, service-window-only. A button tap opens/resets the 24h window.
- TTL: utility default 30 days per docs (Manager UI's "10 minutes" copy is mis-scoped auth text — verify empirically at token rotation). Expiry is SILENT — no webhook; treat "sent but never delivered after TTL" as terminal via our own timeout.
- Pacing: sends can succeed at the API then drop async (`held_for_quality_assessment` → webhook 132015). Handle as terminal non-delivery; never fallback-chase it.
- Messaging limits are portfolio-level: 250 unique recipients/24h at start → 2K (business verification) → 10K → 100K → ∞. In-window messages don't count. Business verification is a P-1 ops item.
- Pricing: per-message since July 2025; utility ≈ USD 0.0008 to CO (re-verify current rate card at rotation — CO rates rose Oct 2025); utility inside an open window is FREE; non-template messages FREE.
- Meta silently recategorizes utility→marketing post-approval (billing changes, template keeps working) — monitor via template webhooks.
- Graph v18/v19 retired; oldest live v20 dies 2026-09-24; retired-version calls silently serve the oldest live version.
- `convex-whatsapp` latest is 1.1.5 (2026-06-07), unmaintained; known gaps: no inbound idempotency, no template-component validation, register-inbound-handler must run ONCE (not per send).

## 4. Billing implementation state (DONE this session)

- `convex/plans.ts`: `maxWhatsAppPerMonth: 200/2000/6000`; `CREDIT_PRODUCT_KEYS` += `extraWhatsApp`; `CREDITS_PER_PURCHASE.extraWhatsApp = 3000`; `CREDIT_KEY_TO_TYPE.extraWhatsApp = "whatsapp"`.
- `convex/polar.ts`: products map += `extraWhatsApp` ← `POLAR_PRODUCT_EXTRA_WHATSAPP` (set in dev; MISSING in prod, see §6).
- `convex/schema.ts`: `creditPurchases.type` += `"whatsapp"`; `extraCredits` += optional `whatsappCredits`/`whatsappPurchasedTotal` (pre-existing rows lack the keys).
- `convex/credits.ts`: `addPurchasedCredits` grants whatsapp credits (null-safe patch for old rows).
- `src/components/pricing/plan-comparison.tsx`: comparison table now renders from Polar product benefits (shared benefit ids across tiers), same keyed products as the cards. Hardcoded feature matrix removed.
- The `order.paid` → grant path needs NO further changes: it is generic over the plans.ts constants.

Still open in billing scope (feature pass): `usage.whatsappMessagesSent` counter + aggregate backfill (Lineage-B `DELETE_MISSING_KEY` landmine), send-time quota gate (allowance → credits → fallback), `ExtraCreditsCards` swap to the WhatsApp pack when email/SMS purchases are removed, `getBarbershopQuotaUsage` whatsapp fields.

## 5. Scope & priority

- **P-1 (unblockers):** rotate `WHATSAPP_ACCESS_TOKEN` (permanent System User token; dead since 2026-07-09), set `WHATSAPP_WABA_ID`, run `syncTemplates` and diff §2 (names, vars, buttons, APPROVED status), fix `WHATSAPP_TEMPLATE_LANGUAGE` → `es_CO` (or drop the env var for a per-template const map), R4/R5 authz fixes (`answerRescheduleRequest`/`requestReschedule`), Meta business verification (tier 250→2K), submit the template batch (decision 4), pnpm-patch Graph pin, prod Polar env vars (§6), re-verify Meta CO utility rate.
- **P0:** sender module (const template map: slug, `es_CO`, ordered vars, header params for `appointment_cancelled`, explicit button payloads, TTL) + workflow-wrapped sends (retry 130429 only); notification pipeline rework: WhatsApp-primary + fallback per decision 8; consent (booking checkbox + profile toggle + schema union `"whatsapp"` + backfill=OFF); metering per decision 9; Lane 1: reschedule accept/reject (harvest `applyRescheduleDecision` + `answerRescheduleRequestFromWhatsApp` + `getWhatsAppReplyId` + codec/tests from Lineage B), inventory ack; barber-side templates wired to existing triggers (`createAppointmentReminder` T−30min, `createPastAppointmentReminder` T+30min).
- **P1:** "Completada"/"No asistió" close-out (finalPrices branching), "Calificar visita" interactive-list rating (needs R6/R7: mint invite on completion, notify on setStatus), `appointment_service_removed_customer`, `appointment_reassigned_customer`, "Voy en camino".
- **Follow-up plan files:** Lane 2 (Pana over WhatsApp); email/SMS purchase removal + channel retirement (kill Twilio path, `ExtraCreditsCards` rework, archive "1000 Correos Extra" in prod).

## 6. Action items outside the repo (owner: user)

1. **Prod Convex deployment has NO Polar env vars** (verified 2026-08-12 — billing cannot work in prod). Set: `POLAR_ORGANIZATION_TOKEN` (production org token), `POLAR_WEBHOOK_SECRET`, and product ids: FREE=`c0eb0e3a-9ba7-42bd-b9a7-c4444e634d31`, PRO_MONTHLY=`2975dff7-a6d7-4210-b558-cbfb03f69bd2`, PRO_YEARLY=`b3114977-0668-4de8-a486-734f035e72c2`, PREMIUM_MONTHLY=`a432b529-654f-41a0-9336-d7585d09e323`, PREMIUM_YEARLY=`da58e9c5-3e74-468a-8278-3c567f9dcb62`, EXTRA_WHATSAPP=`b3c7f98a-6d3c-4814-a7ed-6eaa34e21f2b`, EXTRA_EMAIL=`d5b86449-8f15-4137-88f7-cce8fc7d64a9` (until purchases are removed). No SMS product exists in prod — leave `POLAR_PRODUCT_EXTRA_SMS` unset (code handles it).
2. **Prod catalog is only partially updated** (sandbox is done): pack still "1000 WhatsApp Extra" with `credits: 1000` → rename/regrant to 3000 (price unchanged); plan descriptions still say 100/1000/3000; WhatsApp benefit chips missing on Independiente (200), Barbería YEARLY (2000 — chip exists, attach it), Profesional both (6000).
3. **Benefit chips to add in the dashboards** (no API for benefits) — see the missing-benefits report in the session log / below.
4. Dev deployment: `POLAR_PRODUCT_EXTRA_SMS`/`EMAIL` point at products archived in sandbox on 2026-08-12; the billing page's SMS/email cards are dead in dev until the purchase-removal cleanup lands.
5. Data-quality nits: sandbox pack description says "SMS" (should say WhatsApp); sandbox pack USD price $5.00 vs locked $7.50 (prod is correct); benefit " Invita hasta 5 barberos" has a leading space; barbero-ladder mismatch — code enforces free 5 / pro 10 / premium unlimited, chips say sandbox 3/5/10 and prod —/5/10. Reconcile chips or limits (code + `FREE_MAX_BARBERS` public copy say 5).

## 7. Implementation state (repo side)

- **P-1 (repo) + P0** — implemented 2026-08-12: sender module (`convex/whatsappTemplates.ts`), workflow send with 130429-only retry + serialized fallback (`convex/whatsapp.ts`), consent (booking checkbox + profile toggle, default OFF), metering after send success, Lane 1 inbound (idempotent) for reschedule accept/reject + inventory ack, R4/R5 authz fixes.
- **P1** — implemented 2026-08-15:
  - "Completada" / "No asistió": `appointments.closeoutAppointmentFromWhatsApp` (barber-phone auth, payload binds `date`; shared `applyAppointmentCloseout` core with `setStatus`). A "starting" line without a final price answers with a pointer to the app (template buttons cannot be hidden per send).
  - "Voy en camino": `appointments.markOnMyWayFromWhatsApp` (customer-phone auth, payload binds `date`, `customerOnMyWayAt` stamp = once) → in-app kind `customer_on_my_way` for the assigned barber (in-app only: no barber template exists for it).
  - Rating (R6/R7): completion mints `notifications.createReviewInvite` (registered customers only) → `review_invite_customer_v1` (fallback SMS + in-app; no review-invite email template exists) → tap → `whatsapp.sendRatingList` interactive list (`review-rate:<id>:<1-5>`) → `reviews.createFromWhatsApp` (customer-phone auth, same gates as the form; rating-only = published immediately). `deepLinks.review` now points at the barbershop page (the `?code` route is a redirect shim).
  - `appointment_service_removed_customer` (`createServiceLineRemoved`) and `appointment_reassigned_customer` (`createAppointmentReassigned`, wired into the departing-barber path in `auth.ts`; new in-app kind `appointment_reassigned`) — both new templates await the Meta batch; until APPROVED the sends fall back.
- **Not in this plan** (separate plan files): Lane 2 (Pana over WhatsApp); email/SMS purchase removal + channel retirement. Inbound handlers are idempotent by payload binding but not phone-rate-limited (R10) — revisit if abuse shows up.
