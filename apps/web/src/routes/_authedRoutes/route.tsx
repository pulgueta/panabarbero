import { createFileRoute, Outlet } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/_authedRoutes")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  // Authentication is too slow, commented for now
  // loader: async ({ context }) => {
  //   if (!context.token) {
  //     throw redirect({ to: "/login", replace: true });
  //   }
  // },
});

function RouteComponent() {
  return <Outlet />;
}
