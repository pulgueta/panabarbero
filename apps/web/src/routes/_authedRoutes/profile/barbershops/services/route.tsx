import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/services",
)({
  component: Outlet,
  staticData: { breadcrumb: "Servicios" },
});
