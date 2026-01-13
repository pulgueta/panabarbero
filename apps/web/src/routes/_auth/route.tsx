import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  return <Outlet />;
}
