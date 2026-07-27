# ARCHITECTURE.md

Code rules, patterns, and architecture for PanaBarbero — **TanStack Start (SSR) +
Convex + WorkOS AuthKit + Mercado Pago + Tailwind v4 / Base UI**. This file is the source
of truth for *how the code is written and structured*; `AGENTS.md` covers *how to
behave*. Read the relevant section before touching the corresponding subsystem.

---

## 1. Pattern catalog (how this repo does each thing)

Follow these exactly. They are not suggestions — deviating creates inconsistency
that the next agent has to reconcile.

### 1.1 Data fetching — queryOptions factory + hook pair (SSR-native)

The app uses **selective SSR**. Every Convex read is exposed as a
`*QueryOptions()` factory so it can be **prefetched in a route loader** *and*
consumed in a component with the same key. **Never** call `useQuery` with an
inline `convexQuery(...)` in a component — always go through a factory.

```ts
// in src/hooks/use-<domain>.ts
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";

export function getThingQueryOptions(id: Thing["_id"]) {
  return convexQuery(api.things.getById, { id });
}

export function useThing(id: Thing["_id"]) {
  return useSuspenseQuery(getThingQueryOptions(id));
}

export function useThingActions() {
  return {
    updateThingMutation: useMutation({ mutationFn: useConvexMutation(api.things.update) }),
  };
}

const { updateThingMutation: {
  mutateAsync: updateThing,
  isPending: isUpdatingThing,
  // ...rest
} } = useThingActions();
```

Loaders prefer `context.userId` over re-fetching the session. **Block** the
loader (`await context.queryClient.ensureQueryData(opts)`) only for first-paint
data; otherwise **stream** it (`void context.queryClient.prefetchQuery(opts)`).
See `src/hooks/use-barbershop-members.ts` for the canonical multi-factory hook
and `src/routes/_authedRoutes/profile/index.tsx` for loader prefetch usage.
**Relations:** §2 (auth context that feeds `userId`), §1.4 (the Convex function
the factory points at), `convex-tanstack` skill.

### 1.2 Components

- Functional `FC` components, named exports, colocated under
  `src/components/<domain>/`. Shared primitives live in `src/components/ui/`
  (Base UI + shadcn-style), forms in `src/components/form/`.
- **Heavy/below-the-fold components are `lazy()`-loaded** (see
  `src/components/form/use-form.tsx`, `user-avatar.tsx`). Use React 19
  `<Activity mode="visible|hidden">` to keep mounted-but-hidden subtrees warm
  instead of unmount/remount.
- Icons: `@phosphor-icons/react`, `weight="bold"` by default via the root
  `IconContext`. Haptics: `useWebHaptics()` from `web-haptics/react`.
- **SSR hydration is load-bearing.** Anything whose value differs between server
  and client render (`Date.now()`, locale date formatting, `window.matchMedia`,
  random ids) must be guarded with `suppressHydrationWarning` on the element
  **or** moved into `useEffect`+state. A hydration mismatch regenerates the tree
  client-side and can wipe classes set by inline scripts (this is exactly how
  the theme used to flip to light — see `theme-provider.tsx`, which re-applies
  the `documentElement` classes in an effect). **Relation:** §2, react-doctor's
  `rendering-hydration-mismatch-time` rule.

### 1.3 Forms — TanStack Form via `useAppForm` ONLY

**react-hook-form has been fully removed. Do not reintroduce it.** All forms use
the app form layer in `src/components/form/`:

- `useAppForm` (from `src/components/form/use-form.tsx`) — created with
  `createFormHook`, exposes field components (`TextField`, `TextAreaField`,
  `PasswordField`, `SelectField`, `SwitchField`, `CheckboxField`,
  `RadioGroupField`) and form components (`SubmitButton`, `ResetButton`).
- **The form component owns the form.** Dialogs do **not** create a form and
  pass it down — they pass data + callbacks (`onSuccess`, initial values, ids).
  See `service-form.tsx` / `invite-barber-form.tsx` / `create-appointment-form.tsx`
  as the exemplars.

```tsx
const form = useAppForm({
  onSubmitInvalid: () => haptic.trigger("error"),
  validationLogic: revalidateLogic({ mode: "submit", modeAfterSubmission: "change" }),
  validators: { onSubmit: someZodSchema }, // schema lives in src/lib/schemas.ts or convex/*
  defaultValues,
  onSubmit: async ({ value }) => {
    try {
      await mutation(value);
      haptic.trigger("success"); toast.success("…"); form.reset();
      onSuccess?.();
    } catch (error) {
      haptic.trigger("error"); toast.error(getConvexErrorMessage(error));
    }
  },
});
// <form onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); form.handleSubmit(); }}>
//   <form.AppField name="x">{(field) => <field.TextField label="…" />}</form.AppField>
//   <form.AppForm><form.SubmitButton label="…" /></form.AppForm>
```

### 1.4 Convex functions

- **Always** read the `convex-functions` skill before writing Convex;
  `convex/_generated/ai/guidelines.md` exists only after `convex ai-files install`.
- Functions are built with the **zod-validated custom wrappers** in
  `convex/index.ts`: `zQuery`, `zMutation`, `zAction`, and their
  `zInternal*` counterparts. Use the `internal*` variants for anything not
  called directly by a client.
- **Identity:** never read `ctx.auth` directly. Use `getUserId(ctx)` /
  `requireUserId(ctx)` from `convex/identity.ts` (subject = WorkOS `user_…` id).
- **Authorization is server-authoritative.** Role checks live in
  `convex/authz.ts` (`assertShopRole`, `memberHasRole`, …); plan/subscription
  checks in `convex/acl.ts` (`assertIsSubscribed`, `assertStaffInviteAllowed`,
  …). Client UI gates are UX-only and must be mirrored by a server assertion.
- **Errors:** throw `ConvexError(errorMessages.*)` from `convex/errors.ts`; the
  client surfaces them via `getConvexErrorMessage` (`src/lib/convex-errors.ts`).
- **Analytics:** to record an event, extend the `AppEventName` union in
  `convex/analytics.ts` and call `track(ctx, …)` — never `posthog.capture`
  directly. `"use node"` files (`aiStream.ts`, `tracing.ts`) must stay node;
  importing them from an isolate file breaks codegen (`performance is not defined`).
- **Components are bundled from `dist/`.** Patching a component's `src` alone
  does nothing — the patch must target the built `dist/` output.
- **Email delivery** (`convex/usesend.ts`, `convex/emails.ts`) uses the
  `@pulgueta/usesend-convex` component. React Email templates are rendered to
  HTML and plain text, then enqueued through the component so recipients,
  content, delivery IDs, and status metadata are retained durably. Component
  delivery events enter through the signed `/usesend/webhook` route in
  `convex/http.ts`; cleanup runs daily from `convex/crons.ts` using the package
  retention defaults.
- **Reviews backend** (`convex/convex.config.ts`): a 4th `@convex-dev/aggregate`
  instance `aggregateReviewRatings` (running average rating) and a
  `@convex-dev/workpool` pool `reviewModerationWorkpool` (async review moderation).
  Functions live in `convex/reviews.ts`; the gateway-LLM moderation action is in
  `convex/reviewModeration.ts` (a `"use node"` file — see §3).

**Relations:** §1.1 (the hook that reads it), §2 (identity), §3 (roles/plans
that gate it), `convex-functions` / `convex-security-check` skills.

### 1.5 Validation schemas

Shared zod schemas live in `src/lib/schemas.ts` (client forms) and beside their
Convex function when the same schema validates args (e.g. `inviteBarberSchema`
in `convex/invitations.ts`). Reuse the existing schema; do not duplicate field
rules. Prefer `crypto.randomUUID()` over nanoid for any generated id.

---

## 2. Authentication (the highest-risk subsystem)

WorkOS AuthKit (`@workos/authkit-tanstack-react-start` 0.11.0 +
`@convex-dev/workos-authkit` 0.2.7). The only remaining pnpm patch is
`@tanstack/router-core`.

- **The client must boot with auth already known.** `AuthKitProvider` is seeded
  with `initialAuth` via `SeededAuthKitProvider` in `src/router.tsx`, which
  reads the sanitized auth snapshot (no access token) out of root route context.
  Without this the client boots logged-out and the Convex websocket runs authed
  queries **anonymously**, pushing `null` over the SSR-hydrated user — the
  avatar→sign-in→avatar flicker. Do not remove the seed.
- **The websocket is pre-authenticated before hydration.** `src/router.tsx`
  calls `convex.setAuth(...)` on the client *before* `setupRouterSsrQueryIntegration`
  subscribes queries (Convex subscribes on the React Query cache `added` event,
  ahead of React hydration). This pauses the socket until the token resolves so
  no anonymous query runs. `ConvexProviderWithAuth` replaces the fetcher after
  mount.
- **Auth is fetched once per request, not per navigation.** The snapshot lives
  in `getWorkosAuthQueryOptions()` (`src/hooks/use-session.ts`) with infinite
  `staleTime`/`gcTime`. The root `beforeLoad` reads it via `ensureQueryData`.
  **Do not** call a `getAuth()` server fn directly in `beforeLoad` — that fires
  an RPC on every navigation *and* every intent preload (2–3 s entry latency).
  Auth only changes through full-page redirects (hosted login/logout), so the
  cached snapshot can't go stale mid-session.
- **Route gating:** the authed tree is gated by a `beforeLoad` redirect in
  `src/routes/_authedRoutes/route.tsx` (`if (!context.userId) throw redirect({ to: "/login" })`).
  `/login` and `/register` are redirect-only loaders into hosted AuthKit. There
  are no local auth forms.
- **Post-signup race:** `getCurrentUser` may return a user with no
  `userProfileData` row for a few ms after signup (webhook latency). Flows
  reachable immediately post-signup must tolerate this — see the inline-profile
  fallback in `barbershops.create`.

---

## 3. Roles, plans & app flows

Roles live on `barbershopMembers.roles` (array). The role set is
**`owner | barber | staff`**; there is **no `customer` role** — customers book
without an account/membership. Acquisition:

| Role | How acquired | Gating |
|---|---|---|
| **owner** | Creating a barbershop (`barbershops.create`) inserts an `["owner", ...]` member. Requires an **active billing entitlement** (`assertIsSubscribed`). Paid Mercado Pago plans grant access during a provider-confirmed free trial or after an approved payment; the free plan is local. | `ownerIsBarber` decides whether `"barber"` is also added, i.e. whether the owner attends clients. |
| **barber** | Accepting an invitation whose metadata role is `barber`. | — |
| **staff** (recepcionista) | Accepting an invitation whose role is `staff`. | Inviting staff requires the owner's plan to allow it (`assertStaffInviteAllowed` — pro/premium only; free plan rejects with "límite de personal"). |
| **customer** | Plain signup. No membership row. | Booking needs name + phone; email optional. |

Invitations: backed by **WorkOS Organization Invitations** (`convex/invitations.ts`)

- `convex/workosOrgs.ts`; Each barbershop maps to a WorkOS org (`externalId = barbershopId`);
`invite` calls `userManagement.sendInvitation` with a `roleSlug`, acceptance is
**hosted** by WorkOS, and an `organization_membership.updated` webhook is mirrored
into `barbershopMembers` by `syncWorkosMembership`. Role slugs are
`member` (barber) / `admin` (owner) / `staff`.

Reviews: customers can leave a review **only after a completed appointment**, via a
single-use review code minted on the appointment at completion (there is no other
entry point — see `convex/reviews.ts`). A submitted review is moderated
asynchronously by the same gateway LLM the chat uses (DeepSeek via Vercel AI
Gateway, `convex/reviewModeration.ts`) before it publishes; only abusive content is
hidden, honest negative opinions stay published. Visibility is timestamp-based on
the backend (`publishedAt`/`flaggedAt`); the client only sees a derived `status`.

Per-role flows: owner manages shop/services/team/appointments; barber sees assigned
appointments + availability; staff books on behalf of clients (plan-gated); customer
books, manages own appointments + leaves reviews. **Relations:** §1.4 (the
assertions), §2 (membership keys off the WorkOS user id), §4 (which persona to drive
for each flow).

---

## 4. Test users for agent-browser (dev only)

Four real WorkOS accounts exist on the **dev** deployment
(`grandiose-sturgeon-51`) for end-to-end testing via the **agent-browser** skill
through the Cloudflare tunnel **`https://localhost.panabarbero.com`**. Inboxes
are mail.tm temp mailboxes (accounts do **not** expire; only individual
**messages** expire after 7 days — poll within a week of any verification/reset
email). Use the persona that matches the flow you are testing.

| Persona | App login email | App (WorkOS) password | mail.tm inbox password | Name | State |
|---|---|---|---|---|---|
| **Owner** | `pb-owner-8d01d1@web-library.net` | `V36Q65mWa9c1uhib7_dPIpWb` | `V36Q65mWa9c1uhib7_dPIpWb` | Rafael Domínguez | Pro plan; owns **Barbería El Pana** (Medellín) with service "Corte clásico"; member roles `["owner","barber"]` — flip attending by toggling barber membership |
| **Barber** | `pb-barber-8d01d1@web-library.net` | `fLN3qYoYiLAOK2iGW56KxE-I` | `fLN3qYoYiLAOK2iGW56KxE-I` | Camilo Restrepo | Member `["barber"]` of Barbería El Pana |
| **Staff** | `pb-staff-8d01d1@web-library.net` | `vv4WVuLSTyqIHFsUa3yiEUV` | `-vv4WVuLSTyqIHFsUa3yiEUV` | Valentina Ortiz | Member `["staff"]` (recepcionista) of Barbería El Pana |
| **Customer** | `pb-customer-8d01d1@web-library.net` | `hxo84LebadepQ6qAKd120` | `-hxo84Leba-depQ6qAKd120_` | Daniela Marín | Plain account, no membership — use for booking flows |

Notes that will bite you if ignored:

- **App password ≠ inbox password for staff & customer.** Their original mail.tm
  passwords start with `-`, which breaks naive CLI typing, so their **WorkOS**
  passwords were reset to dash-free values (the table's "App password" column).
  The "inbox password" column is what the mail.tm **API/poller** needs to read
  their email; the "App password" is what you type into the WorkOS login form.
- **Reading verification/reset codes:** `POST https://api.mail.tm/token`
  `{address, password: <inbox password>}` → bearer token → `GET /messages` →
  `GET /messages/{id}`; the 6-digit code is in the subject/body. Rate limit is
  8 req/s/IP — space requests out.
- **Pick by flow:** booking → Customer; team/services/settings → Owner;
  barber-side appointment views → Barber; reception/on-behalf booking → Staff.
- These are **throwaway dev creds with zero production access**; they are
  intentionally in this committed file. Do **not** add real WorkOS/Mercado Pago/Convex
  secrets here — those live in `.env.local` / `pnpx convex env`.
- **Reviews flow:** any new Customer persona can exercise reviews — complete an
  appointment for them as Owner/Barber, then leave the review as that Customer via
  the single-use review code (see §3).

### Creating more test users (mail.tm parity)

Need another persona? Mint a fresh mail.tm inbox so it matches the four above
(API docs: <https://docs.mail.tm/llms.txt>). Accounts do **not** expire, but
**messages expire after 7 days** — poll within a week of any verification/reset
email. Rate limit is **~8 req/s/IP — space requests out**.

1. `GET https://api.mail.tm/domains` → pick an available domain.
2. `POST https://api.mail.tm/accounts` with `{ address, password }` → creates the
   inbox.
3. `POST https://api.mail.tm/token` with `{ address, password }` → bearer token,
   then `GET /messages` → `GET /messages/{id}` to read the 6-digit
   verification/reset code from the subject/body.
4. **Parity note:** mail.tm passwords that start with `-` break naive CLI typing,
   so when a generated password begins with `-`, reset the **WorkOS app password**
   to a dash-free value and record **both** columns in the table — "App (WorkOS)
   password" (what you type into the login form) and "mail.tm inbox password"
   (what the mail.tm API/poller needs) — exactly like the staff/customer rows do.

**Relations:** §2 (login mechanics), §3 (what each role can do), agent-browser
skill, "Browser review workflow" in project memory.
