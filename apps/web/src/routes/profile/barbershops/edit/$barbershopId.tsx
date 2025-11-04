import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";

export const Route = createFileRoute("/profile/barbershops/edit/$barbershopId")(
  {
    component: RouteComponent,
  },
);

function RouteComponent() {
  const params = Route.useParams();

  return (
    <BorderContainer>
      <header className="mb-6 flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1
          className="font-bold text-3xl tracking-tight"
          style={{
            viewTransitionName: `barbershop-${params.barbershopId}-edit`,
          }}
        >
          Editar barbería
        </h1>
      </header>
    </BorderContainer>
  );
}
