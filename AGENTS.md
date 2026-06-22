
# AGENTS.md

PanaBarbero is a barbershop marketplace + management app: **TanStack Start (SSR) + Convex + WorkOS AuthKit + Polar + Tailwind v4 / Base UI**. Package manager is **pnpm only**. All user-facing copy is **Spanish (es-CO)**.

> [!IMPORTANT]
> Keep `AGENTS.md` updated with project status.

<!-- intent-skills:start -->
## Skill Loading

Before substantial work:

- Skill check: run `pnpm dlx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `pnpm dlx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

---

## 0. The discipline (read before editing anything)

This codebase has had three full backend migrations (auth, notifications,
analytics) and carries a **pnpm patch** (`@tanstack/router-core`) and
**strict-evaluation config** that punish blind edits. Before you change a file:

1. **Research before code.** Read the file, its imports, its callers, and the
   relation links below. If the change touches Convex, **read the
   `convex-functions` skill first** (or `convex/_generated/ai/guidelines.md`,
   present only after `pnpm dlx convex ai-files install`) — those rules override
   training priors. If it touches a third-party SDK, read the installed source
   under `node_modules/.pnpm/<pkg>/...` rather than guessing the API.
2. **State assumptions; surface tradeoffs.** If two interpretations exist,
   name them. If a simpler path exists, say so. If something is unclear, stop
   and ask — do not paper over confusion with defensive code.
3. **Surgical changes only.** Every changed line must trace to the task. Don't
   reformat, "improve", or refactor adjacent code. Match existing style. Remove
   only the orphans *your* change created; flag pre-existing dead code, don't
   delete it.
4. **Examine edge cases.** Auth latency, SSR/client hydration parity, empty
   states, post-signup race windows (profile row may not exist yet), plan/role
   gating, optimistic-update rollback. The landmines around auth (§2), Convex
   components (§1.4), and `"use node"` files are real; re-read those sections
   when working near them.
5. **Goal-driven verification.** Turn the task into a checkable goal and loop
   until it passes. The required gates are in §7.

If a senior engineer would call your change overcomplicated or speculative,
rewrite it smaller.

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

WorkOS AuthKit (`@workos/authkit-tanstack-react-start` 0.6.0 +
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
| **owner** | Creating a barbershop (`barbershops.create`) inserts an `["owner", ...]` member. Requires an **active Polar subscription** (`assertIsSubscribed`). | `ownerIsBarber` decides whether `"barber"` is also added, i.e. whether the owner attends clients. |
| **barber** | Accepting an invitation whose metadata role is `barber`. | — |
| **staff** (recepcionista) | Accepting an invitation whose role is `staff`. | Inviting staff requires the owner's plan to allow it (`assertStaffInviteAllowed` — pro/premium only; free plan rejects with "límite de personal"). |
| **customer** | Plain signup. No membership row. | Booking needs name + phone; email optional. |

Invitations: backed by **WorkOS Organization Invitations** (`convex/invitations.ts`

- `convex/workosOrgs.ts`; the old `convex-invite-links` component and `inviteLinks`
table are gone). Each barbershop maps to a WorkOS org (`externalId = barbershopId`);
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
  intentionally in this committed file. Do **not** add real WorkOS/Polar/Convex
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

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `pnpm dlx convex ai-files install`.

<!-- convex-ai-end -->

---

## 5. Think before coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 6. Simplicity & surgical changes

- Minimum code that solves the problem. No speculative features, abstractions
  for single-use code, configurability that wasn't requested, or error handling
  for impossible scenarios. If 200 lines could be 50, rewrite it.
- Touch only what you must. Don't "improve" adjacent code, comments, or
  formatting. Match existing style. Remove only the orphans your change created;
  flag pre-existing dead code instead of deleting it. Every changed line traces
  to the task.

## 7. Committing

When asked to commit, group files by relevance and relationship — one commit per logical unit (e.g. Convex backend changes together, UI components together, config/docs together). Never bundle unrelated files into a single commit.

Commit messages must be short: `type(scope): brief description` — no body, no bullet points. The diff is the documentation. Examples:

```sh
feat(appointments): add reschedule request form
fix(auth): seed initialAuth before hydration
chore(convex): update schema validators
```

Types: `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, `test`. Keep scope tight (the domain/folder, not the whole app).

---

## 8. Goal-driven execution & required gates

Turn the task into a verifiable goal and loop until it passes ("add validation"
→ "write tests for invalid inputs, then make them pass"). Before you call a task
done, run:

- `pnpm dlx react-doctor@latest . --project panabarbero --verbose --diff` — when
  you touched React. No new regressions vs `main` (a known baseline of
  pre-existing warnings exists; don't fix unrelated ones).
- `pnpx tsc --noEmit` — clean except the 3 byte-identical-to-`main` pre-existing
  failures (`cropper.tsx`, `file-upload.tsx`, `src/store/services/index.ts`).
- `pnpx biome check` on **your** files (double quotes, 2-space indent,
  `import type` for type-only imports). Don't reformat files you didn't change.
- `pnpm build` (vite) → exit 0 for anything affecting the build/SSR.
- For auth/SSR/router changes, verify in the **real app** via agent-browser
  (§4) — confirm no avatar flicker, no `_nonReactive` console error, no
  hydration mismatch, theme stays on system. tests passing ≠ behavior verified.

Useful commands:

```sh
pnpm dev                                   # convex dev + vite
pnpx convex dev --once                      # one-shot push to Convex Cloud
pnpx convex env list                        # deployment env vars (compare with .env.local on auth issues)
pnpx convex data <table> --limit N          # inspect a table
pnpm doctor:diff                           # react-doctor on the diff
```

**These guidelines are working if:** fewer unnecessary diffs, fewer rewrites due
to overcomplication, and clarifying questions come before implementation rather
than after mistakes.
