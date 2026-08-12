# User Flow — Smoke Tests

Authentication, profile and navigation flows shared by **every** user, regardless
of role. Read this together with `customer-flow.md`, `barber-flow.md` and
`barber-owner-flow.md` for role-specific behaviour, and `AGENTS.md` §2 for the
auth architecture rationale.

> **Ground truth:** Authentication is **WorkOS AuthKit hosted** — there are **no
> local auth forms** in this app. `/login` and `/register` are redirect-only
> loaders. There is **no `/forgot-password`, `/reset-password` or
> `/verify-email` route** — WorkOS owns those screens. Do not document or test
> local credential forms; they do not exist.

---

## General User Authentication & Profile Flows

### 1. Sign Up Flow (WorkOS hosted)

`src/routes/_auth/register.tsx` is a redirect-only loader.

- [ ] Navigate to `/register`
- [ ] If already authenticated → redirected to `/profile?tab=account`
- [ ] Otherwise → `throw redirect({ href: await getSignUpUrl() })` sends the
      user to the **WorkOS hosted sign-up page**
- [ ] Complete sign-up on WorkOS (email + password or social, owned by WorkOS)
- [ ] WorkOS redirects back to `/callback` (`src/routes/callback.tsx`, handled by
      `handleCallbackRoute()`)
- [ ] A `userProfileData` row is provisioned via the WorkOS webhook
- [ ] **Post-signup race:** the profile row may not exist for a few ms after
      sign-up (webhook latency). Flows reachable immediately after sign-up must
      tolerate a missing profile (see the inline-profile fallback in
      `barbershops.create`).

> New accounts have **no barbershop membership** — they are plain users
> (informally "customers"). There is **no plan/tier on the user**; plan limits
> resolve from the owner's effective billing entitlement, not from the member's account.

### 2. Email Verification / Password Recovery

- [ ] **Owned entirely by WorkOS hosted pages.** There are no in-app
      `/verify-email`, `/forgot-password` or `/reset-password` routes.
- [ ] Verification and password-reset emails are sent by WorkOS, not by the app's
      `usesend` pipeline.

### 3. Login Flow (WorkOS hosted)

`src/routes/_auth/login.tsx` is a redirect-only loader.

- [ ] Navigate to `/login`
- [ ] If already authenticated → redirected to `/profile?tab=account`
- [ ] Otherwise → `throw redirect({ href: await getSignInUrl() })` to the WorkOS
      hosted sign-in page
- [ ] WorkOS redirects back to `/callback` on success
- [ ] The client boots with auth **already seeded** (`SeededAuthKitProvider` in
      `src/router.tsx`) — verify there is **no avatar→sign-in→avatar flicker**
- [ ] Session persists across navigation; auth is fetched **once per request**,
      not per navigation (cached `getWorkosAuthQueryOptions`)

### 4. Logout Flow

- [ ] Open the user avatar popover (`src/components/layout/user-avatar.tsx`)
- [ ] Click "Cerrar sesión"
- [ ] `signOut()` (WorkOS AuthKit client) terminates the WorkOS session
- [ ] Redirect to home; protected routes are no longer accessible

### 5. User Profile Management (`/profile`)

`src/routes/_authedRoutes/profile/index.tsx`. The tab is controlled by the
`?tab=` search param. **Tabs are role-gated** (`src/components/profile/`):

| Tab (`?tab=`) | Label | Visible to | Component |
|---|---|---|---|
| `notifications` | Notificaciones | all users | `NotificationsTab` (in-app inbox) |
| `account` | Perfil | all users | `AccountTab` |
| `plans` | Planes | **owners only** | `PlansTab` (subscription/billing) |
| `danger` | Peligro | **owners only** | `DangerTab` |
| `appointments` | Citas | **non-owner/barber/staff (customers)** | `AppointmentsTab` |

- [ ] **Perfil (Account) tab** (`account-tab.tsx`):
  - [ ] View name, email (read-only), phone, profile photo
  - [ ] Update name → `updateName({ name })`
  - [ ] Update / clear phone → `updatePhoneNumber({ phoneNumber })` or
        `updatePhoneNumber({ clearPhoneNumber: true })`
  - [ ] **Email is not editable in-app** — the field is disabled (changing it
        means signing in with a new email via WorkOS)
  - [ ] Upload profile photo (`ProfilePhotoUploader`)
  - [ ] Toggle email/SMS notification preferences →
        `updateNotificationPreference({ type, enabled, userId })` (SMS toggle is
        disabled when no phone is set)
- [ ] **Citas (Appointments) tab** — only for users with no membership; see
      `customer-flow.md` §6.
- [ ] **Peligro (Danger) tab** — owners only; deletes the owned barbershop via
      `barbershops.delete` and redirects to `/barbershops`.

### 6. Notification Preferences

- [ ] Stored per user in `userProfileData.notificationsPreferences` (array of
      `{ type: "email" | "sms", enabled }`)
- [ ] Checked server-side before any email/SMS is sent (`convex/notifications.ts`)
- [ ] SMS toggle requires a phone number on file

### 7. Session Management & SSR

- [ ] Session persists across refresh and navigation
- [ ] Auth changes only through full-page WorkOS redirects (login/logout), so the
      cached snapshot cannot go stale mid-session
- [ ] No `_nonReactive` console error, no hydration mismatch, theme stays on
      system (verify per `AGENTS.md` §7 when touching auth/SSR/router)

### 8. Navigation & Route Access

- [ ] **Public routes** (no auth required to view):
  - [ ] `/` (home — redirects authed users to `/profile?tab=account`)
  - [ ] `/pricing`
  - [ ] `/privacy-policy`, `/tos`
  - [ ] `/barbershops` (listing)
  - [ ] `/barbershops/$barbershopUuid` (detail)
  - [ ] `/barbershops/$barbershopUuid/book` (booking form — **public route, but
        the form requires sign-in to submit**; see `customer-flow.md` §3)
  - [ ] `/ai`, `/chat`, `/chat/$threadId` (Pana AI assistant)
- [ ] **Protected routes** (under `_authedRoutes`, gated by `beforeLoad` redirect
      to `/login` when `!context.userId`):
  - [ ] `/profile`
  - [ ] `/profile/barbershops/appointments` (owner/barber/staff)
  - [ ] `/profile/barbershops/services` (owner/staff)
  - [ ] `/profile/barbershops/settings` (owner only)
  - [ ] `/profile/barbershops/team` (owner/staff)
  - [ ] Unauthenticated access → redirect to `/login` → WorkOS hosted sign-in
  - [ ] Member-only pages redirect non-members back to an allowed page (e.g.
        `team`/`settings` redirect to `/profile/barbershops/appointments`)

### 9. Roles & Authorization

Roles live on `barbershopMembers.roles` (array). The role set is
**`owner | barber | staff`** — there is **no `customer` role**. Customers are
simply users with no membership row.

- [ ] **User with no membership ("customer"):**
  - [ ] Can browse barbershops and book (must be signed in to submit)
  - [ ] Sees the `Citas` tab in profile
  - [ ] Cannot access any `/profile/barbershops/*` management page
- [ ] **Barbershop member (owner/barber/staff):**
  - [ ] Sees role-appropriate management pages
  - [ ] Authorization is **server-authoritative** (`convex/authz.ts`
        `assertShopRole`, `assertOwner`, etc.); client gates are UX-only

### 10. Pricing & Plan Information

- [ ] Navigate to `/pricing`
- [ ] View plan tiers (Free / Pro / Premium; paid products use Polar and
      all limits come from `convex/plans.ts`)
- [ ] An **active billing entitlement is required to create a barbershop**
      (`assertIsSubscribed`); paid plans require an approved payment
- [ ] Owners see subscription status in the `Planes` profile tab

### 11. Error Handling & Edge Cases

- [ ] **Auth errors** are surfaced by WorkOS on its hosted pages, not in-app
- [ ] **Missing profile post-signup** — tolerated by inline fallback; no crash
- [ ] **Convex errors** are thrown as `ConvexError(errorMessages.*)` and surfaced
      client-side via `getConvexErrorMessage`
- [ ] **Network errors** — mutations show a toast with the Convex error message
