import { createFileRoute, redirect } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { isBarberQueryOptions } from "@/hooks/use-barbershop-members";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/")({
  pendingComponent: LoadingComponent,
  component: RouteComponent,
  beforeLoad: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const isBarber = await context.queryClient.ensureQueryData(
        isBarberQueryOptions(user.userId),
      );

      if (isBarber) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      } else {
        throw redirect({ to: "/profile", search: { tab: "account" } });
      }
    }
  },
  ssr: true,
});

function RouteComponent() {
  const { data: user } = useSession();

  return (
    <BorderContainer className="min-h-[calc(100dvh-65px)]">
      <main>
        <header className="rounded-xl bg-primary/80 p-4 text-primary-foreground">
          <h1 className="mb-2 text-balance text-center font-bold text-3xl tracking-tighter">
            PanaBarbero
          </h1>
          <p className="text-balance text-center text-primary-foreground text-sm">
            La solución para las barberías.
          </p>
        </header>
      </main>
      <h1>Hello "/"!</h1>
      {user ? <h1>Authenticated</h1> : <h1>Unauthenticated</h1>}
    </BorderContainer>
  );
}
