/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is guaranteed to be not null */

import { PlusIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
import { SettingsCard } from "@/components/barbershops/settings/settings-card";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { useClipboard } from "@/hooks/use-clipboard";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

const DashboardHeader = lazy(() =>
  import("@/components/barbershops/dashboard-header").then((mod) => ({
    default: mod.DashboardHeader,
  })),
);
const AvailabilityForm = lazy(() =>
  import("@/components/barbershops/availability/availability-form").then(
    (mod) => ({
      default: mod.AvailabilityForm,
    }),
  ),
);
const ServiceDialog = lazy(() =>
  import("@/components/barbershops/services/service-dialog").then((mod) => ({
    default: mod.ServiceDialog,
  })),
);
const AddressForm = lazy(() =>
  import("@/components/barbershops/settings/address-form").then((mod) => ({
    default: mod.AddressForm,
  })),
);
const GeneralInfoForm = lazy(() =>
  import("@/components/barbershops/settings/general-info-form").then((mod) => ({
    default: mod.GeneralInfoForm,
  })),
);
const PreferencesForm = lazy(() =>
  import("@/components/barbershops/settings/preferences-form").then((mod) => ({
    default: mod.PreferencesForm,
  })),
);
const LocationForm = lazy(() =>
  import("@/components/barbershops/settings/location-form").then((mod) => ({
    default: mod.LocationForm,
  })),
);
const OwnerRoleToggle = lazy(() =>
  import("@/components/barbershops/settings/owner-role-toggle").then((mod) => ({
    default: mod.OwnerRoleToggle,
  })),
);
const BarbershopLogoUploader = lazy(() =>
  import("@/components/barbershops/barbershop-logo-uploader").then((mod) => ({
    default: mod.BarbershopLogoUploader,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/",
)({
  component: SettingsPage,
  pendingComponent: LoadingComponent,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(userId),
        );

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      await opts.context.queryClient.ensureQueryData(
        isBarberQueryOptions(userId),
      );

      if (barbershop) {
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );
        void opts.context.queryClient.prefetchQuery(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function SettingsPage() {
  const { data: user } = useSession();
  const [copy] = useClipboard();

  const { data: barbershop } = useBarbershopByOwnerId(user?.id!);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: isBarber } = useIsBarber(user?.id!);

  const { trigger } = useWebHaptics();

  const isOwner = barbershop && rolesData?.isOwner;
  const hasService = services?.length && services.length > 0;
  const hasAnyActiveDay = barbershop?.availability?.some(
    (a) => a.weekDay.isActive,
  );

  const url = `${window.location.origin}/barbershops/${barbershop?.uuid}`;

  const onCopyLink = () => {
    copy(url)
      .then(() => {
        toast.success("Link copiado al portapapeles");
        trigger("success");
      })
      .catch(() => {
        toast.error("Error al copiar el link");
        trigger("error");
      });
  };

  return (
    <BorderContainer>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <Suspense fallback={<DashboardHeaderSkeleton />}>
          <DashboardHeader
            title="Configuración"
            description="Administra el perfil público y la operación de tu barbería."
          />
        </Suspense>

        {isOwner && (
          <Button variant="outline" size="sm" onClick={onCopyLink}>
            <ShareNetworkIcon weight="bold" />
            Copiar link
          </Button>
        )}
      </div>

      {barbershop && rolesData?.isOwner && (
        <div className="space-y-10">
          {(!hasAnyActiveDay || !hasService) && (
            <div className="space-y-3">
              {!hasAnyActiveDay && (
                <Alert>
                  <AlertTitle>Horario de atención requerido</AlertTitle>
                  <AlertDescription>
                    Configura el horario de apertura y cierre de tu barbería.
                    Puedes aplicar los mismos horarios a varios días o
                    establecerlos uno por uno.
                  </AlertDescription>
                </Alert>
              )}

              <Suspense fallback={<Skeleton className="h-28 w-full" />}>
                {!hasService && (
                  <Alert variant="warning">
                    <AlertTitle>Debes crear al menos un servicio</AlertTitle>
                    <AlertDescription>
                      Agrega tu primer servicio para que tus clientes puedan
                      reservar.
                      <div className="mt-2">
                        <ServiceDialog
                          barbershopId={barbershop._id}
                          trigger={
                            <Button variant="outline">
                              <PlusIcon /> Agregar servicio
                            </Button>
                          }
                        />
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </Suspense>
            </div>
          )}

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground text-lg tracking-tight">
                Perfil público
              </h2>
              <p className="text-muted-foreground text-sm">
                Lo que tus clientes ven al visitar tu barbería.
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
              <SettingsCard
                title="Información general"
                description="Nombre y descripción pública de tu barbería."
              >
                <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                  <GeneralInfoForm barbershop={barbershop} />
                </Suspense>
              </SettingsCard>

              <SettingsCard
                title="Dirección"
                description="Dirección, ciudad y departamento."
              >
                <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                  <AddressForm barbershop={barbershop} />
                </Suspense>
              </SettingsCard>

              <SettingsCard
                title="Logo"
                description="Imagen que identifica tu barbería en la plataforma."
              >
                <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                  <BarbershopLogoUploader
                    barbershopId={barbershop._id}
                    logoKey={barbershop.logoKey}
                  />
                </Suspense>
              </SettingsCard>

              <SettingsCard
                title="Ubicación"
                description="Fija el punto exacto de tu barbería para que tus clientes te encuentren."
              >
                <Suspense fallback={<Skeleton className="h-72 w-full" />}>
                  <LocationForm barbershop={barbershop} />
                </Suspense>
              </SettingsCard>
            </div>
          </section>

          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="font-semibold text-foreground text-lg tracking-tight">
                Operación
              </h2>
              <p className="text-muted-foreground text-sm">
                Ajustes que definen cómo funciona tu barbería.
              </p>
            </div>

            <div className="space-y-4">
              {barbershop.availability.length > 0 && (
                <SettingsCard
                  title="Disponibilidad"
                  description="Define los días y horas en los que tu barbería atiende."
                >
                  <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                    <AvailabilityForm
                      barbershopId={barbershop._id}
                      availability={barbershop.availability}
                    />
                  </Suspense>
                </SettingsCard>
              )}

              <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                <SettingsCard
                  title="Preferencias"
                  description="Ajustes operativos como el periodo de gracia."
                >
                  <Suspense fallback={<Skeleton className="h-40 w-full" />}>
                    <PreferencesForm barbershop={barbershop} />
                  </Suspense>
                </SettingsCard>

                <SettingsCard
                  title="Tu rol"
                  description="Decide si atiendes clientes como barbero o solo administras."
                >
                  <Suspense fallback={<Skeleton className="h-32 w-full" />}>
                    <OwnerRoleToggle
                      barbershopId={barbershop._id}
                      isCurrentlyBarber={isBarber}
                    />
                  </Suspense>
                </SettingsCard>
              </div>
            </div>
          </section>
        </div>
      )}
    </BorderContainer>
  );
}
