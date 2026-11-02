import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/appointments",
)({
  component: Outlet,
  staticData: { breadcrumb: "Citas" },
});
