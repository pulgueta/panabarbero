import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/_authedRoutes")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (!user?.userId) {
      throw redirect({ to: "/login", replace: true });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
