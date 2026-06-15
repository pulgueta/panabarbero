# Barber Flow — Smoke Tests

Appointment and service flows for a **barber** member (role `barber`). For
owner-side administration (settings, billing, inviting) see
`barber-owner-flow.md`; for the staff/reception persona see the staff notes in
`barber-owner-flow.md` §9–10.

> **Ground truth corrections vs. older drafts:**
> - Invitations are **WorkOS Organization Invitations** now — there are **no
>   in-app invite codes or `/invitations/:code` pages**. Acceptance happens on a
>   WorkOS-hosted page; the app learns about it via a webhook. (See §1.)
> - Barber management pages live under **`/profile/barbershops/*`**, not a
>   separate dashboard.
> - Appointment statuses are: `pending`, `confirmed`, `cancelled`, `completed`,
>   `no-show`, `rescheduled`, `denied`.
> - Services are **auto-assigned to a barber when they join** — no manual
>   assignment is required for them to start taking bookings.

---

## Barber Appointment & Service Flows

### 1. Accept a Barbershop Invitation (WorkOS hosted)

Backed by `convex/invitations.ts` + `convex/workosOrgs.ts`. Each barbershop maps
1:1 to a WorkOS organization (`barbershops.workosOrganizationId`).

- [ ] Owner/staff sends an invite from the Team page (role `barber` → WorkOS slug
      `member`)
- [ ] Invitee receives a **WorkOS-hosted invitation email** (no app token/code)
- [ ] Invitee accepts on the WorkOS hosted page
- [ ] WorkOS fires `organization_membership.updated` → `syncWorkosMembership`
      creates/updates the `barbershopMembers` row with the `barber` role
- [ ] `syncWorkosMembership` retries (up to 5×, 2s apart) if the profile/org row
      is not ready yet
- [ ] On becoming a barber, **all current shop services are auto-assigned** via
      `assignAllServicesToBarber`
- [ ] There is **no in-app decline flow** — declining/ignoring happens on WorkOS

### 2. Become an Active Barber

- [ ] After acceptance the shop appears for the barber in their profile
- [ ] Barber can reach `/profile/barbershops/appointments` and
      `/profile/barbershops/services`
- [ ] Barber **cannot** reach `/profile/barbershops/settings` (owner only) or, if
      not staff, the Team page

### 3. View Appointments (`/profile/barbershops/appointments`)

- [ ] Calendar view for a selected date + a table/list of appointments
- [ ] Status badges: Pendiente, Confirmada, Completada, Cancelada, No asistió,
      Reagendada, Denegada (`src/lib/appointment-utils.ts`)
- [ ] A "Crear cita" (staff/on-behalf booking) button appears **only** when the
      owner's plan allows it (`canCreateStaffAppointments`, pro/premium) — see
      `barber-owner-flow.md` §19

### 4. View Appointment Details

- [ ] Customer name, contact phone/email
- [ ] Service name, price, duration
- [ ] Scheduled date/time, status, notes
- [ ] Grace period (per-barbershop, default 5 min)
- [ ] Available actions depend on status (below)

### 5. Mark Status — Completed / No-show / Cancelled

`convex/appointments.ts` `setStatus` (callable by barber/staff/owner, **not** the
customer who owns it):

- [ ] **Completed** → status `completed`, increments barbershop metrics, cancels
      pending scheduled notifications
- [ ] **No-show** → status `no-show`
- [ ] **Cancelled** → status `cancelled` (soft-deletes / frees the slot), cancels
      scheduled notifications
- [ ] Cannot re-apply a terminal status

### 6. Cancel an Appointment

- [ ] `convex/appointments.ts` `cancel` — sets `cancelled`, stores an optional
      reason in notes, notifies the opposite party (email/SMS/in-app)

### 7. Respond to a Customer Reschedule Request

`answerRescheduleRequest` — only the **non-requester** may answer:

- [ ] **Accept** → appointment `date` set to the customer's `proposedDate`,
      status `rescheduled`, notifications re-scheduled, acceptance notification
      sent, old slot freed
- [ ] **Deny** → status `denied`, proposed fields cleared, denial notification
      sent; appointment keeps its original date
- [ ] There is no separate "counter-propose" mutation — to offer a different
      time, deny and submit a fresh `requestReschedule`

### 8. Services Visible to the Barber (`/profile/barbershops/services`)

`convex/services.ts` + `convex/barbershopMemberServices.ts`. Service management
(create/edit/delete) is gated to **owner/staff**; a barber primarily **sees**
which services they offer.

- [ ] A barber's offered services come from the `barbershopMemberServices` table
- [ ] `getServicesForBarber` returns the barber's active services
- [ ] Owner/staff assign services via `setBarberServices` /
      `addServiceToBarber` / `removeServiceFromBarber` (see
      `barber-owner-flow.md` §15)
- [ ] Service validation (schema): `name` 3–255 chars, `price` ≥ 1000 (COP),
      `duration` 5–480 minutes

### 9. Schedule & Availability

- [ ] Availability is defined **per barbershop**, not per barber, in the shop's
      `availability` array (per-day open/close + optional lunch break) and
      `gracePeriodMinutes`
- [ ] The barber's bookable slots derive from shop hours minus lunch break,
      existing appointments and grace period (`getAvailableSlots`)
- [ ] A barber's own schedule card is shown in the profile Account tab
      (lazy-loaded) for owners/barbers

### 10. Notifications Received

`convex/notifications.ts` (email via `usesend`, SMS via Twilio, in-app inbox):

- [ ] New appointment created → notification with customer/service/date/time
- [ ] Reschedule request from a customer → notification
- [ ] Customer cancellation → notification
- [ ] All sends respect the recipient's preferences and the shop's monthly quota

### 11. Edge Cases & Error Handling

- [ ] **Inactive barbershop:** no new bookings can be created
- [ ] **Double booking:** overlapping slots are rejected server-side
- [ ] **Invalid time:** outside hours / during lunch / in the past is rejected
- [ ] **Service won't fit:** duration exceeding the remaining window is rejected
- [ ] **Plan limits:** staff/on-behalf appointment creation is blocked on the
      free plan (`assertCanCreateStaffAppointment`) — see `barber-owner-flow.md`
