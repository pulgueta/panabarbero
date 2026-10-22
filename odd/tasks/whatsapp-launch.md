# WhatsApp launch

## Objective

Make the WhatsApp notification channel on `feat/whatsapp-component` deliver real messages, use neutral message copy, and merge the branch to `main`.

## Problem

- The dev deployment pointed at the Meta test WABA (`1222769120037854`, +1 555-181-7718), which has none of the PanaBarbero `es_CO` templates.
- The app webhook (`868260962634234`) had zero subscribed fields, so inbound button taps never reached Convex.
- Two template names in code did not match Meta (`appointment_reminder_customer_v1`, `inventory_low_stock_v1`).
- Six templates used by the code do not exist on Meta: `appointment_created_barber`, `appointment_reschedule_request_barber`, `appointment_reschedule_resolved`, `past_appointment_reminder_barber`, `appointment_service_removed_customer`, `appointment_reassigned_customer`. Their sends fall back to email/SMS.
- `appointment_reschedule_request_customer` has no "Rechazar cambio" quick reply on Meta.
- Template copy is wordy and inconsistent (for example "Si necesitas ayuda, responde aquí." conflicts with the canned reply "Este chat solo envía avisos").

## Facts (verified 2026-10-22)

- Real WABA: `PanaBarbero` `1287728980015597`, portfolio `1637709003772845`, payment method present, business verification in progress.
- Real phone: +1 555-956-2856, id `1125596227309148`, `LIVE`, `VERIFIED`, `TIER_250`, display name "Pulguetabot".
- Token: System User "convex", permanent, full access to both WABAs and the app.
- A third-party app "Kapso" (`1087358919742996`) is also subscribed to the real WABA.
- A Meta app has one webhook callback per object. It points at the dev deployment. Prod needs `override_callback_uri` on its WABA subscription, or a second app.

## Tasks

- [x] T1 Fill credentials on dev: `WHATSAPP_WABA_ID`, `WHATSAPP_PHONE_NUMBER_ID`, subscribe `messages` webhook field. Route: inline. Evidence: Graph API `subscriptions` shows `["messages"]`; `syncTemplates` lists the six `es_CO` templates.
- [x] T2 Fix template names to `_v1`; make `syncTemplates` / `listApprovedTemplates` internal (they were public). Route: inline. Evidence: `tsc -p convex` 0 errors, dev push OK.
- [ ] T3 Live end-to-end test: template send to +18328592591, button tap round trip. Partial: Meta accepted 2 sends of `appointment_reminder_customer_v1`, both then `failed` with 131042 "Business eligibility payment issue". `health_status`: phone LIMITED (display name not approved), business LIMITED (141010 business verification not passed), WABA AVAILABLE. Card Mastercard ••1270 attached, COP, balance 0. Kapso is a full-control partner + connected app; credit-line owner unverified, so Kapso stays until billing is clear. ZapFast check blocked: Computer Use not approved for ZapFast. Owner action: fix billing in Settings → Billing & payments → Accounts → Messaging accounts → PanaBarbero.
- [ ] T7 Review fixes (Fable review, verified): template QR taps never parsed (stored as `type:"text"`, payload `{payload,text}`); inbound dedup keyed on component `_id` (new row per webhook retry); reschedule try/catch inside sub-mutation (partial writes); async `failed` statuses never trigger fallback (overrides plan decision 8 on evidence: the component stores `failed` + `errorDetails`); `syncTemplates` never scheduled; workflows never cleaned; closeout throw reported as "inactive"; inbound marker table never purged; 0-quota shown as unlimited; wordy reply copy. Route: delegated writer (6+ non-trivial files).
- [ ] T4 Neutral copy: rewrite the approved templates as new versions and draft the six missing ones; submit to Meta after user approval of the copy.
- [ ] T5 Prod readiness: prod WhatsApp + Polar env vars, prod webhook callback, `migrations:stripLegacyChannelData` on prod.
- [ ] T6 Commit in logical units, open PR, merge after checks.

## Checks

`pnpm test`, `tsc -p convex`, `pnpm lint` on changed files, `pnpm build`, `pnpm doctor:diff`, live send.

## Next step

Get the recipient phone for T3.
