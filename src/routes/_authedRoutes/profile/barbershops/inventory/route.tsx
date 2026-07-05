import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/inventory",
)({
  component: Outlet,
  staticData: { breadcrumb: "Inventario" },
});
