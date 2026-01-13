import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/_authedRoutes")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    const user = context.user;

    return { user };
  },
});

function RouteComponent() {
  return <Outlet />;
}
