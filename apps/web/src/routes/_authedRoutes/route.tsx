import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/_authedRoutes")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    return { user };
  },
});

function RouteComponent() {
  return <Outlet />;
}
