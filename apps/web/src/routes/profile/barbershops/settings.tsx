import { AvailabilityForm } from "@/components/barbershops/availability/availability-form";
import { BarbershopsDropdown } from "@/components/barbershops/barbershops-dropdown";
import { CreateServiceDialog } from "@/components/barbershops/services/create-service-dialog";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopsByOwnerIdQueryOptions,
  useBarbershopsByOwnerId,
} from "@/hooks/use-barbershop";
import { useServicesFromBarbershop } from "@/hooks/use-services";
import { getSessionQueryOptions } from "@/hooks/use-session";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";

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
  const { barbershopId } = Route.useSearch();
  const { user } = Route.useLoaderData();
  const navigate = Route.useNavigate();

  const { data: barbershops, isLoading: isLoadingBarbershops } =
    useBarbershopsByOwnerId(user?.userId ?? "");

  const { data: services, isLoading: isLoadingServices } =
    useServicesFromBarbershop(barbershopId);

  const currentBarbershop = barbershops?.find((b) => b._id === barbershopId);

  if (currentBarbershop) {
    navigate({
      to: ".",
      search: (prev) => ({ ...prev, barbershopId: currentBarbershop._id }),
    });
  }

  const hasService = (services?.length ?? 0) > 0;
  const hasAnyActiveDay =
    currentBarbershop?.availability?.some((a) => a.weekDay.isActive) ?? false;

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-3xl tracking-tight">
            Configuración de barbería
          </h1>

          <BarbershopsDropdown
            barbershops={barbershops ?? []}
            isLoading={isLoadingBarbershops}
          />
        </div>
      </section>

      {isLoadingBarbershops ? (
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

          {!hasService && !isLoadingServices && currentBarbershop ? (
            <Alert variant="warning">
              <AlertTitle>Debes crear al menos un servicio</AlertTitle>
              <AlertDescription>
                Agrega tu primer servicio para que tus clientes puedan reservar.
                <div className="mt-2">
                  <CreateServiceDialog barbershopId={currentBarbershop._id} />
                </div>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert variant="warning">
              <AlertTitle>Debes crear al menos un servicio</AlertTitle>
              <AlertDescription>
                Agrega tu primer servicio para que tus clientes puedan reservar.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <section className="space-y-4">
            <h2 className="font-semibold text-xl">Disponibilidad</h2>
            <p className="text-muted-foreground text-sm">
              Define los días y horas en los que tu barbería atiende.
            </p>

            {currentBarbershop && (
              <AvailabilityForm
                barbershopId={currentBarbershop._id}
                availability={currentBarbershop.availability}
              />
            )}
          </section>
        </>
      )}
    </BorderContainer>
  );
}
