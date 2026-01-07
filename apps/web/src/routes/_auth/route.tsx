import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { isBarberQueryOptions } from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/_auth")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const isBarber = await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );

      throw redirect({
        to: isBarber ? "/profile/barbershops/appointments" : "/profile",
        search: { tab: "account" },
      });
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
