import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";

export const Route = createFileRoute("/_authedRoutes")({
  ssr: "data-only",
  beforeLoad: ({ context }) => {
    if (!context.userId) {
      throw redirect({ to: "/login" });
    }
  },
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  return <Outlet />;
}
