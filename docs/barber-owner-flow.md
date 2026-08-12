# Barbershop Owner Flow — Smoke Tests

Business and administrative flows for the **owner** role, plus the **staff**
(recepcionista) persona where it overlaps. Read `barber-flow.md` for the barber
persona and `customer-flow.md` for the booking experience an owner manages.

> **Ground truth corrections vs. older drafts:**
> - Creating a barbershop **requires an active billing entitlement**
>   (`assertIsSubscribed`). An active or trialing Polar subscription is
>   required (the free "Independiente" product counts).
> - `ownerIsBarber` is a **creation-time decision** that sets whether the owner
>   also attends clients (roles `["owner","barber"]` vs `["owner"]`).
> - A new barbershop starts **inactive** (`isActive: false`) and activates when
>   its first service is created.
> - Team invitations are **WorkOS Organization Invitations** (hosted accept +
>   webhook sync) — no in-app invite codes.
> - Plan limits below come from `convex/plans.ts` and are enforced in
>   `convex/acl.ts`.

---

## Owner Business & Administrative Flows

### 1. Create a Barbershop

`convex/barbershops.ts` `create` + `src/components/barbershops/create-barbershop-form.tsx`.

- [ ] **Requires an active billing entitlement** — `assertIsSubscribed(ctx, userId)`
      throws `subscriptionRequired` otherwise
- [ ] Fields: `name` (≥3 chars), `address.fullAddress`, `address.details?`,
      `city`, `state`, `zipCode?`, `contactPhone?`, `gracePeriodMinutes`
      (default 5), `availability` (per-day open/close + optional lunch),
      `ownerIsBarber` (boolean)
- [ ] **Role assignment:** `ownerIsBarber` → `["owner","barber"]` (owner attends
      clients) else `["owner"]` (admin-only)
- [ ] **Post-signup race fallback:** if the `userProfileData` row is missing,
      `create` provisions it inline from `authkit.getAuthUser()`
- [ ] On success: schedules WorkOS org creation
      (`internal.workosOrgs.createOrganizationForBarbershop`), tracks
      `barbershop_created`, and the shop starts **inactive** until the first
      service exists

### 2. Access Barbershop Management

All under `src/routes/_authedRoutes/profile/barbershops/`. Access is gated at the
loader via `barbershopMemberRolesQueryOptions(userId)`:

| Page | Access | Purpose |
|---|---|---|
| `appointments/` | owner / barber / staff | Calendar + table of appointments, reschedule handling, staff booking (plan-gated) |
| `services/` | owner / staff | Create / edit / delete services |
| `team/` | owner / staff | Barberos, Recepcionistas, Invitaciones tabs |
| `settings/` | **owner only** | Shop info, address, hours, status, owner-barber toggle |

Non-members are redirected to `/profile/barbershops/appointments`.

### 3–8. Update Shop Settings (`settings/`, owner only)

Editable via `barbershops.update` (+ helper mutations). Each section:

- [ ] **General:** `name`, `description`, logo/banner
      (`setLogoKey` / `removeLogoKey`)
- [ ] **Address & location:** `address.fullAddress`, `address.details`, `city`,
      `state`, `zipCode`, plus `latitude`/`longitude`
- [ ] **Contact:** `contactPhone` (auto-formatted)
- [ ] **Business hours / availability:** per day toggle active, open/close times,
      optional lunch start/end via `updateDayAvailability` (single day) or
      `updateAvailability` (full array). Closing after opening; lunch within
      hours
- [ ] **Grace period:** `gracePeriodMinutes` buffer between appointments
- [ ] **Social links:** Instagram, Facebook, TikTok, Twitter/X, YouTube, website
- [ ] **Activate / deactivate:** toggle `isActive` (syncs the WorkOS org state).
      Inactive shops are not bookable and not shown to customers
- [ ] **Owner-barber toggle** (`OwnerRoleToggle`): add/remove the `barber` role on
      the owner's own membership to start/stop attending clients

### 9. Invite a Team Member (`team/`)

`convex/invitations.ts` `invite` action. **WorkOS Organization Invitations** —
no codes, hosted acceptance, webhook sync. App role → WorkOS slug:
`barber → member`, `staff → staff`, `owner → admin`.

- [ ] Enter the invitee's email and choose role(s) (`barber` or `staff`)
- [ ] **Server-authoritative gating** (`prepareInvite`):
  - [ ] Caller owns the shop (owner; staff may invite barbers)
  - [ ] Inviting **staff** is owner-only and plan-gated
        (`assertStaffInviteAllowed`)
  - [ ] Inviting **barber** is plan-gated (`assertBarberInviteAllowed`)
  - [ ] Email is not already a member
- [ ] WorkOS sends the hosted invitation email
- [ ] Invitee accepts on WorkOS → `organization_membership.updated` webhook →
      `syncWorkosMembership` creates the `barbershopMembers` row
- [ ] On a new barber, all shop services auto-assign
      (`assignAllServicesToBarber`)
- [ ] **Invitaciones tab** lists/resends/revokes invitations by querying the
      WorkOS API directly (no Convex invitations table); revoke/resend require
      `assertCanManageTeam`

### 10. Plan Limits (source: `convex/plans.ts`, enforced in `convex/acl.ts`)

Product key → plan tier: `independiente → free`,
`barberiaMonthly`/`barberiaYearly → pro`,
`barberiaProfMonthly`/`barberiaProfYearly → premium`. **Limits are always checked
against the owner's plan**, even when staff perform the action.

| Limit | Free | Pro | Premium |
|---|---|---|---|
| `maxInvitedBarbers` | 5 | 10 | Ilimitado |
| `maxStaff` | 0 | 1 | 3 |
| `maxSmsPerMonth` | 200 | 1,000 | 3,000 |
| `maxEmailPerMonth` | 50 | 500 | 1,500 |
| `staffCanCreateAppointments` | ❌ | ✅ | ✅ |
| `panaManagement` (AI agent) | ❌ | ✅ | ✅ |

- [ ] **Free:** can invite up to 5 barbers; **0 staff** (staff invites rejected
      outright); no staff-created appointments; no Pana management
- [ ] **Pro / Premium:** raise the caps above and unlock staff booking + Pana
      management

### 11. Manage Team Members

- [ ] **Barberos tab:** barber members + their service assignments
- [ ] **Recepcionistas tab:** staff members
- [ ] **Invitaciones tab:** pending WorkOS invitations (resend/revoke)
- [ ] Role merges respect barber↔staff exclusivity in `syncWorkosMembership`

### 12–14. Services (`services/`, owner / staff)

`convex/services.ts`. Validation (schema): `name` 3–255, `price` ≥ 1000 (COP),
`duration` 5–480 minutes.

- [ ] **Create** (`services.create`) — gated by `assertCanManageServices`
      (owner/barber/staff); **auto-activates the barbershop** when it is the first
      service; auto-assigns the service to the owner when the owner is the only
      active barber
- [ ] **Edit** — same validation; changes apply to new appointments (existing
      keep their snapshot)
- [ ] **Delete** — confirmation surfaces any impacted upcoming appointments

### 15. Assign Services to Barbers

`convex/barbershopMemberServices.ts`. Only owner/staff may assign; the target
member must have the `barber` role.

- [ ] `setBarberServices` — replace a barber's full service list
- [ ] `addServiceToBarber` / `removeServiceFromBarber` — single service
- [ ] New barbers get **all** services auto-assigned on join (no manual step)

### 16–18. Appointments Management (`appointments/`)

- [ ] Calendar + table; filter/sort by status, barber, date, customer
- [ ] Open an appointment for full details and status-appropriate actions
- [ ] Lifecycle mutations: `setStatus` (completed/no-show/cancelled), `cancel`,
      `requestReschedule`, `answerRescheduleRequest` (see `barber-flow.md` §5–7)
- [ ] Reschedule handling mirrors the barber flow (accept → `rescheduled`,
      deny → `denied`); counter-propose = deny + new request

### 19. Staff / On-behalf Appointments

`CreateAppointmentForm` (`src/components/appointments/create-appointment-form.tsx`).

- [ ] Gated by `assertCanCreateStaffAppointment` — **pro/premium only**; free plan
      hides the "Crear cita" button and the mutation rejects
- [ ] Owner/staff pick barbershop → barber → service → date/time → customer info
      and create the appointment with `isStaffCreated: true`

### 20. Business Metrics

- [ ] Completed appointments increment barbershop metrics on `setStatus`
      (`completed`)
- [ ] Dashboard surfaces month-to-date counts and rating/review aggregates when
      present (reviews are schema-only today — see `customer-flow.md` §11)

### 21. Reviews

- [ ] Reviews are stored in the `reviews` table and surfaced on the public
      barbershop detail page when populated
- [ ] **No owner-reply feature exists**, and there is no in-app review-creation
      path yet (schema-only) — do not test a "respond to review" flow

### 22–23. Subscription, Plan & Usage

- [ ] Owners view subscription/plan status in the **Planes** profile tab
- [ ] SMS/email usage is metered monthly against the plan quota
      (`isSmsLimitNotExceeded` / `isEmailLimitNotExceeded`), with purchased
      credits added on top
- [ ] Upgrading raises the caps in §10; paid products are billed through
      Polar

### 24. Activate / Deactivate Barbershop

- [ ] Toggle `isActive` in settings; deactivation hides the shop from customers
      and blocks new bookings, syncs the WorkOS org, and leaves existing
      appointments untouched

### 25. View Public Profile

- [ ] Verify the public `/barbershops/$barbershopUuid` page reflects all settings
      (info, hours, services, barbers, social links, banner)

### 26. Notification Scenarios

- [ ] Owners/barbers receive new-appointment, reschedule-request and cancellation
      notifications per their preferences and the shop's quota (see
      `customer-flow.md` §13)

### 27. Error Handling & Edge Cases

- [ ] **Subscription required:** cannot create a barbershop without an active plan
- [ ] **Plan limit reached:** barber/staff invites beyond the cap are rejected
- [ ] **Staff on free plan:** blocked entirely (`maxStaff: 0`)
- [ ] **Inactive shop:** no bookings; activate first
- [ ] **Double booking / invalid time / service won't fit:** rejected server-side
