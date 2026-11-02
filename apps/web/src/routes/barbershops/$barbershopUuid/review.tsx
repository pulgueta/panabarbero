import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * Compatibility shim. Review-invite emails sent before the appointment-based
 * eligibility flow deep-link to `/barbershops/:uuid/review?code=...`
 * (`notificationCopy.ts` → `deepLinks.review`); the form now lives on the
 * barbershop page itself, so old links land there instead of a 404. The
 * single-use `code` is obsolete and dropped.
 */
export const Route = createFileRoute("/barbershops/$barbershopUuid/review")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/barbershops/$barbershopUuid",
      params: { barbershopUuid: params.barbershopUuid },
      replace: true,
    });
  },
});
