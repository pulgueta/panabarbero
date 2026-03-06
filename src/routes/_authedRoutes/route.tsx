import { AuthBoundary } from "@convex-dev/better-auth/react";
import { api } from "@convex/_generated/api";
import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { authClient } from "@/lib/auth-client";
import { isAuthError } from "@/lib/utils";

export const Route = createFileRoute("/_authedRoutes")({
  ssr: "data-only",
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  const navigate = Route.useNavigate();

  return (
    <AuthBoundary
      isAuthError={isAuthError}
      authClient={authClient}
      onUnauth={() => navigate({ to: "/login" })}
      getAuthUserFn={api.auth.getCurrentUser}
    >
      <Outlet />
    </AuthBoundary>
  );
}
