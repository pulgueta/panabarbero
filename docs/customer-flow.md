# Customer Flow — Smoke Tests

Discovery, booking, reschedule and review flows for **end users with no
barbershop membership** ("customers"). Customers are plain authenticated users —
there is **no `customer` role**. See `user-flow.md` for the shared auth/profile
flows this builds on.

> **Ground truth corrections vs. older drafts:**
> - The booking route is **`/barbershops/$barbershopUuid/book`**, not
>   `/appointments/create` (that route does not exist).
> - Booking **requires sign-in to submit**. The route is public, but the
>   "Confirmar cita" button is disabled while logged out and shows _"Para
>   reservar una cita, debes iniciar sesión."_ There is no anonymous booking
>   path through the UI.
> - New appointments are created with status **`confirmed`**, not `pending`.
> - The **review system is schema-only and not wired to the UI yet** — see §11.

---

## Customer Discovery & Appointment Flows

### 1. Browse Barbershops (`/barbershops`)

- Navigate to the barbershops listing page
- View available barbershops (grid/list)
- Search by name; filter by city/state location
- View preview (name, address, rating, review count)
- Loading skeleton while fetching; empty state when none match

### 2. View Barbershop Details (`/barbershops/$barbershopUuid`)

- Banner image, name, full address, contact phone, description
- Business hours per day (including lunch breaks where configured)
- Services with prices and durations
- Barbers working at the shop and the services each one offers
- Social links (Instagram, Facebook, TikTok, Twitter/X, YouTube) and website
- Reviews and aggregate rating (when present — see §11)
- A CTA to start booking (`/barbershops/$barbershopUuid/book`)

### 3. Start Booking (`/barbershops/$barbershopUuid/book`)

Route: `src/routes/barbershops/$barbershopUuid/book.tsx` →
`CustomerBookingForm` (`src/components/appointments/customer-booking-form.tsx`).

- The route is **public** and loads services, barbers and availability for SSR
- If **not signed in**: the form renders, but "Confirmar cita" is disabled and
  the helper text reads _"Debes iniciar sesión para poder reservar."_
- If **signed in**: the user's profile pre-fills name/phone/email

### 4. Booking Form Steps (single page, top-to-bottom)

- **Select service** — dropdown of shop services with price + duration; this
  filters which barbers are available
- **Select barber** — only barbers who offer the chosen service; auto-selected
  when only one qualifies
- **Contact info** — name (pre-filled from profile), phone (required,
  pre-filled, overridable), email (optional, pre-filled, overridable)
- **Date & time** — calendar (past dates and closed days disabled) + time-slot
  picker in 30-min intervals
- **Notes** — optional note for the barber
- **Summary & confirm** — review then submit "Confirmar cita"

On submit, `convex/appointments.ts` `create` validates server-side:
- Service and barber exist and belong to the shop
- Day is active in the shop's availability
- Slot is within opening/closing hours
- Slot does **not** overlap the lunch break
- Slot does **not** overlap an existing `pending`/`confirmed`/`rescheduled`
  appointment for that barber
- Created appointment status is **`confirmed`**
- Two scheduler tasks are queued: a reminder **30 min before** and a
  "leave a review" prompt **30 min after**

### 5. Booking — Error Scenarios

- **Validation:** empty/invalid name, phone, or email surface inline errors
- **Availability:** a slot taken between load and submit → Convex error toast;
  past dates and closed days are disabled in the picker
- **Business rules:** overlap with lunch break or another appointment is rejected
  server-side with a `ConvexError` surfaced via `getConvexErrorMessage`

### 6. View My Appointments (`/profile?tab=appointments`)

`AppointmentsTab` (`src/components/profile/appointments-tab.tsx`), rendered only
for users with **no membership**.

- Appointments shown as `AppointmentCard`s in a paginated grid (9 per page,
  cursor-based Next/Previous)
- Each card shows: barbershop name, date/time, service, and a status badge
- Status values (exact, from schema): `pending`, `confirmed`, `cancelled`,
  `completed`, `no-show`, `rescheduled`, `denied`
- Status labels (`src/lib/appointment-utils.ts`): Pendiente, Confirmada,
  Cancelada, Completada, No asistió, Reagendada, Denegada

### 7. Appointment Card Actions (by state)

`src/components/appointments/appointment-card.tsx`:

- **Upcoming & not completed/cancelled/denied** → "Reagendar" (request reschedule)
- **Has a pending `proposedDate`** → "Ver solicitud" (respond to a reschedule)
- **Completed / cancelled / denied, or in the past** → "Eliminar" (soft-delete
  the card; sets `deletedAt`)
- A `confirmed` appointment can be cancelled via the cancel dialog
  (`cancel-appointment-dialog.tsx`)

### 8. Cancel Appointment

- Open a `pending` or `confirmed` appointment → cancel dialog
- Optional cancellation reason (stored in notes)
- `convex/appointments.ts` `cancel` sets status `cancelled`, frees the slot,
  cancels scheduled notifications, and notifies the other party (email/SMS/in-app
  per preferences)

### 9. Request a Reschedule

`reschedule-request-form.tsx` → `requestReschedule`:

- Pick a new proposed date/time (same availability validation as booking)
- Appointment status becomes **`pending`** with `proposedDate` and
  `rescheduleRequestedByUserId` recorded
- A reschedule-request notification is sent to the barber/shop
- Cannot reschedule a completed/cancelled/denied appointment, an already-pending
  one, or one in the past

### 10. Respond to a Reschedule (other party proposed/decided)

`reschedule-response-dialog.tsx` → `answerRescheduleRequest`. Only the **non-
requester** can answer.

- **Accept** → appointment `date` set to `proposedDate`, status `rescheduled`,
  notifications re-scheduled for the new time, acceptance notification sent
- **Deny** → status `denied`, proposed fields cleared, denial notification sent;
  the appointment keeps its original date and must be re-requested

### 11. Reviews (⚠ schema-only — not yet in the UI)

- A `reviews` table exists in `convex/schema.ts`
  (`{ uuid, rating, comment?, userId, barbershopId }`)
- **There is currently no mutation to create a review and no review UI** in the
  customer flow. The "leave a review" scheduler prompt exists, but the
  submission path is not wired up.
- Treat any "leave review" step as **aspirational** until the create-review
  mutation and form land. Aggregate rating/review display on the barbershop
  detail page reads from this table when populated.

### 12. Account Settings & Preferences

See `user-flow.md` §5–6. Customers can edit name, phone, profile photo and
email/SMS notification preferences. Email is read-only.

### 13. Notification Scenarios

Sent via the `usesend` email pipeline + Twilio SMS + in-app inbox, gated by the
user's notification preferences and the shop's monthly quota
(`convex/notifications.ts`, `convex/acl.ts`):

- **Appointment created** — to customer & barber (email/SMS/in-app)
- **Reminder** — to customer, 30 min before (scheduler)
- **Review prompt** — 30 min after (scheduler)
- **Cancelled** — to the opposite party, with reason if provided
- **Reschedule request** — to the opposite party
- **Reschedule decision (accepted/denied)** — to the opposite party

Email templates live in `emails/emails/appointments/`.

### 14. Edge Cases & Error Handling

- **No availability:** no selectable slots for the chosen barber/day
- **Inactive barbershop:** not bookable (shop must be `isActive`)
- **Soft-deleted appointment:** not viewable (filtered by `deletedAt`)
- **Stale slot:** a slot taken between load and submit is rejected server-side
