import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/barbers",
)({
  component: Outlet,
  staticData: { breadcrumb: "Barberos" },
});
