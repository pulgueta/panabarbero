import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare `/profile/barbershops` has no page of its own — every persona lands on
// Citas. Without this, the breadcrumb's "Panel" crumb would link to a route
// that renders an empty content area.
export const Route = createFileRoute("/_authedRoutes/profile/barbershops/")({
  beforeLoad: () => {
    throw redirect({ to: "/profile/barbershops/appointments" });
  },
});
