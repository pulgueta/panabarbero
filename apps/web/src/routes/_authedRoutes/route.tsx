import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { ClientAuthBoundary } from "@/components/layout/auth-boundary";
import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/_authedRoutes")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context }) => {
    if (!context.token) {
      throw redirect({ to: "/login", replace: true });
    }
  },
});

function RouteComponent() {
  return (
    <ClientAuthBoundary>
      <Outlet />
    </ClientAuthBoundary>
  );
}
