import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { LoadingComponent } from "@/components/layout/loading-component";
import { isBarberQueryOptions } from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/_auth")({
  ssr: "data-only",
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const isBarber = await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );

      if (isBarber) {
        throw redirect({
          to: "/profile/barbershops/appointments",
          replace: true,
        });
      } else {
        throw redirect({
          to: "/profile",
          search: { tab: "appointments" },
          replace: true,
        });
      }
    }
  },
});

function RouteComponent() {
  return <Outlet />;
}
