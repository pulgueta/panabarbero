# Product

## Register

product

## Users

Two co-primary audiences, both in Colombia, both mostly on a phone:

- **Barbershop owners & barbers.** They run the shop from the app — managing the
  shop profile, team, services, availability, and the appointment calendar,
  often between cuts. Access is role-based (owner / barber / staff), so each
  person sees only the surface their job needs. Their job: keep the chair full,
  never lose or miss a booking, get paid, and run the shop without a separate
  agenda or POS.
- **Clients.** They want to find a barbershop they trust nearby (filtered by
  departamento and ciudad), pick a barber and service, and book a slot fast —
  frequently **without creating an account** (name + phone is enough), still
  receiving email/SMS confirmations and reminders. Their job: book the next cut
  in seconds and not have to remember it.

Context for both: mobile-first, on the go, Colombian Spanish, variable
connectivity. Many clients are not power users — friction or jargon loses them.

## Product Purpose

Online booking and barbershop management for Colombia. Clients discover shops by
location, choose a barber + service, and book (no account required); the system
fires automatic email/SMS notifications across the full appointment lifecycle —
booked, reminder, cancellation, reschedule request, accept/reject, no-show.
Owners manage team, services, availability, and appointments, with billing
through Polar (free for solo independents, paid tiers for teams). **Pana IA**, a
built-in AI assistant, lets users search shops, check availability, and
book/cancel in natural language with explicit confirm/reject steps.

Success looks like: a booking completed in seconds, zero forgotten or lost
appointments, and an owner who runs the entire shop from the app.

Two co-primary surfaces share one design system: the **authenticated app**
(product register) and the **marketing landing** (brand register). The register
is a default, not a cage — work the landing with the brand lens, the app with
the product lens.

## Brand Personality

**Fast, low-friction, polished, professional.** The interface earns trust
through speed and craft, not decoration or folksiness. The name carries
Colombian warmth (*pana* = buddy), but the product proves itself by getting out
of the way: book in a few taps, manage in a few more. Voice is Spanish,
plain-spoken, direct and concrete ("Tu próximo corte está a un clic de
distancia") — never buzzword-laden, never cutesy. Confident, modern, dependable.

## Anti-references

- **Generic gradient SaaS.** No purple gradients, no glassmorphism-as-default,
  no hero-metric template, no walls of identical icon + heading cards, no
  gradient text. The current dark surface with a single barber-pole-red accent
  is deliberately the opposite of the template look; keep it that way.
- The corollaries that follow from "fast + polished": nothing that adds
  friction or decoration without earning it, and nothing that buries the booking
  action under marketing or directory clutter.

## Design Principles

1. **Speed is the feature.** Every primary task — find a shop, book a slot,
   manage an appointment — should be reachable in the fewest taps. The UI
   disappears into the task; choreography never makes the user wait.
2. **Mobile is the home, desktop is the window.** Design for a barber's thumb
   between cuts and a client standing on the street: bottom-reachable primary
   actions, large targets. Desktop is the secondary view, not the source of
   truth.
3. **Polish over flourish.** Trust is earned through consistent components,
   complete states (loading, empty, error, success), and craft — not visual
   tricks. Restraint reads as serious; decoration reads as a side project.
4. **The booking action is sacred.** Never let directory density, marketing
   copy, or navigation chrome bury the path to "reservar." One obvious next step
   on every screen.
5. **Notifications are the promise.** The appointment lifecycle (book → remind →
   reschedule → complete) is the product's spine. Surface state clearly and
   honestly at every step, on both sides of the chair.

## Accessibility & Inclusion

Target **WCAG 2.2 AA**, mobile-first.

- Honor `prefers-reduced-motion` (already wired globally — view transitions and
  animations collapse to near-instant). Keep new motion behind the same guard.
- Verify contrast deliberately on the dark surface: muted-foreground body text
  and the red primary both sit close to the edges of the AA ramp; bump toward
  ink rather than ship light-gray-on-near-black.
- Mobile ergonomics: large thumb targets, primary actions within bottom reach,
  haptic feedback on key interactions.
- Spanish (es-CO) only — no i18n burden, but copy must stay plain and concrete
  for a broad, non-technical audience.
- Account-free booking is itself an inclusion choice: it removes the biggest
  barrier for less tech-savvy or first-time clients.
