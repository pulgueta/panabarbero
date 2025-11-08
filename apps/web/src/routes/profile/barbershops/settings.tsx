/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is guaranteed to be not null */
import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";

import { AvailabilityForm } from "@/components/barbershops/availability/availability-form";
import { BarbershopsDropdown } from "@/components/barbershops/barbershops-dropdown";
import { CreateServiceDialog } from "@/components/barbershops/services/create-service-dialog";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopsByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/use-barbershop";
import { useServicesFromBarbershop } from "@/hooks/use-services";
import { getSessionQueryOptions } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/settings")({
  component: SettingsPage,
  pendingComponent: LoadingComponent,
  validateSearch: (search: { barbershopId: Barbershop["_id"] }) => {
    return search;
  },
  loaderDeps: ({ search }) => ({
    barbershopId: search.barbershopId,
  }),
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await opts.context.queryClient.prefetchQuery(
        barbershopsByOwnerIdQueryOptions(user.userId),
      );
    }

    return {
      user,
    };
  },
});

function SettingsPage() {
  const { user } = Route.useLoaderData();

  const { data: barbershop, isLoading: isLoadingBarbershop } =
    useBarbershopByOwnerId(user?.userId ?? "");

  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershop?._id!);

  const hasService = services?.length && services.length > 0;
  const hasAnyActiveDay = barbershop?.availability?.some(
    (a) => a.weekDay.isActive,
  );

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h1 className="text-balance font-bold text-xl tracking-tight">
            Configuración de barbería
          </h1>

          <BarbershopsDropdown
            barbershops={[barbershop!]}
            isLoading={isLoadingBarbershop}
          />
        </div>
      </section>

      {isLoadingBarbershop ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <>
          {!hasAnyActiveDay && (
            <Alert variant="warning">
              <AlertTitle>Horario de atención requerido</AlertTitle>
              <AlertDescription>
                Configura el horario de apertura y cierre de tu barbería. Puedes
                aplicar los mismos horarios a varios días o establecerlos uno
                por uno.
              </AlertDescription>
            </Alert>
          )}

          {!hasService && !isLoadingServices && barbershop && (
            <Alert variant="warning">
              <AlertTitle>Debes crear al menos un servicio</AlertTitle>
              <AlertDescription>
                Agrega tu primer servicio para que tus clientes puedan reservar.
                <div className="mt-2">
                  <CreateServiceDialog barbershopId={barbershop._id} />
                </div>
              </AlertDescription>
            </Alert>
          )}

          <section className="space-y-4">
            <div>
              <h2 className="font-bold text-xl tracking-tight">
                Disponibilidad
              </h2>
              <p className="text-muted-foreground text-sm">
                Define los días y horas en los que tu barbería atiende.
              </p>
            </div>

            {barbershop && (
              <AvailabilityForm
                barbershopId={barbershop._id}
                availability={barbershop.availability}
              />
            )}
          </section>
        </>
      )}
    </BorderContainer>
  );
}
