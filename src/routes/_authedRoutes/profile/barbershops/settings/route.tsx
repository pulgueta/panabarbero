import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings",
)({
  component: Outlet,
  staticData: { breadcrumb: "Ajustes" },
});
