/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is guaranteed to be not null */
import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlusIcon, Share } from "lucide-react";
import { lazy, Suspense } from "react";
import { toast } from "sonner";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  barbershopMetadataQueryOptions,
  useBarbershopMetadata,
} from "@/hooks/barbershop/use-barbershop-metadata";
import { useClipboard } from "@/hooks/use-clipboard";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

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
const SocialMediaForm = lazy(() =>
  import("@/components/barbershops/settings/social-media-form").then((mod) => ({
    default: mod.SocialMediaForm,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings",
)({
  component: SettingsPage,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await opts.context.queryClient.ensureQueryData(getSessionQueryOptions());
    }

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(user.userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(user.userId),
        );

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      if (barbershop) {
        await opts.context.queryClient.ensureQueryData(
          barbershopMetadataQueryOptions(barbershop._id),
        );
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function SettingsPage() {
  // const [_, convert, ref] = useToPng<HTMLDivElement>({
  //   onSuccess: (data) => {
  //     const link = document.createElement("a");
  //     link.download = "codigo-qr-barberia.jpeg";
  //     link.href = data;
  //     link.click();
  //   },
  // });

  const { data: user } = useSession();
  const [copy] = useClipboard();

  const { data: barbershop } = useBarbershopByOwnerId(user?.userId!);
  const { data: barbershopMetadata } = useBarbershopMetadata(barbershop?._id!);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);

  const hasService = services?.length && services.length > 0;
  const hasAnyActiveDay = barbershop?.availability?.some(
    (a) => a.weekDay.isActive,
  );

  const url = `${window.location.origin}/barbershops/${barbershop?.uuid}`;

  const onCopyLink = () => {
    copy(url)
      .then(() => {
        toast.success("Link copiado al portapapeles");
      })
      .catch(() => {
        toast.error("Error al copiar el link");
      });
  };

  return (
    <BorderContainer className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-balance font-bold text-2xl tracking-tight">
          Configuración de barbería
        </h1>

        <p className="text-pretty text-muted-foreground text-sm">
          Actualiza la información de tu barbería con la más reciente.
        </p>
      </header>

      {barbershop && rolesData?.isOwner && (
        <>
          {/* <div className="flex flex-col items-center justify-center gap-2">
            <div ref={ref}>
              <QRCode
                size="lg"
                value={url}
                options={{
                  dotsOptions: { color: "var(--secondary)" },
                  cornersSquareOptions: { color: "var(--primary)" },
                  cornersDotOptions: { color: "var(--primary)" },
                }}
                className="mx-auto max-w-max"
              />
            </div>

            <p className="text-muted-foreground text-sm">
              Comparte este código QR con tus clientes para agendar en tu
              barbería.
            </p>

            <Button onClick={convert}>
              <Download className="size-3" />
              Descargar código QR
            </Button>
          </div> */}

          <Button onClick={onCopyLink}>
            <Share className="size-3" />
            Copia el link de tu barbería
          </Button>

          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <header>
                <h2 className="font-bold text-xl tracking-tight">
                  Información general
                </h2>
                <p className="text-muted-foreground text-sm">
                  Nombre y descripción pública de tu barbería.
                </p>
              </header>

              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <GeneralInfoForm barbershop={barbershop} />
              </Suspense>
            </div>

            <div className="space-y-2">
              <header>
                <h2 className="font-bold text-xl tracking-tight">Dirección</h2>
                <p className="text-muted-foreground text-sm">
                  Dirección, ciudad y departamento.
                </p>
              </header>

              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <AddressForm barbershop={barbershop} />
              </Suspense>
            </div>
          </section>

          {/* <Separator />

          <section className="space-y-4">
            <div>
              <h2 className="font-bold text-xl tracking-tight">Contacto</h2>
              <p className="text-muted-foreground text-sm">
                Formas de contacto para tus clientes.
              </p>
            </div>

            <ContactForm
              barbershop={barbershop}
              barbershopMetadata={barbershopMetadata!}
            />
          </section> */}

          {/* <Separator /> */}

          {/* <section className="space-y-4">
            <div>
              <h2 className="font-bold text-xl tracking-tight">Medios</h2>
              <p className="text-muted-foreground text-sm">
                Imagen de banner y sitio web.
              </p>
            </div>

            <MediaForm barbershop={barbershop} />
          </section> */}

          {/* <Separator /> */}

          {/* <section className="space-y-4">
            <div>
              <h2 className="font-bold text-xl tracking-tight">
                Ubicación geográfica
              </h2>
              <p className="text-muted-foreground text-sm">
                Coordenadas para mejorar la ubicación en el mapa (opcional).
              </p>
            </div>

            <CoordinatesForm barbershop={barbershop} />
          </section> */}

          <Separator />

          <section className="flex w-full flex-col gap-4 sm:items-start sm:justify-start md:flex-row">
            <section className="min-h-44 w-full space-y-4">
              <div>
                <h2 className="font-bold text-xl tracking-tight">
                  Preferencias
                </h2>
                <p className="text-muted-foreground text-sm">
                  Ajustes operativos como el periodo de gracia.
                </p>
              </div>

              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <PreferencesForm barbershop={barbershop} />
              </Suspense>
            </section>

            <section className="flex min-h-44 w-full flex-col justify-between gap-4">
              <div>
                <h2 className="font-bold text-xl tracking-tight">
                  Redes sociales
                </h2>
                <p className="text-muted-foreground text-sm">
                  Enlaces a redes sociales de tu barbería.
                </p>
              </div>

              <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                <SocialMediaForm
                  barbershop={barbershop}
                  barbershopMetadata={barbershopMetadata!}
                />
              </Suspense>
            </section>
          </section>

          <Separator />
        </>
      )}

      {!hasAnyActiveDay && rolesData?.isOwner && (
        <Alert>
          <AlertTitle>Horario de atención requerido</AlertTitle>
          <AlertDescription>
            Configura el horario de apertura y cierre de tu barbería. Puedes
            aplicar los mismos horarios a varios días o establecerlos uno por
            uno.
          </AlertDescription>
        </Alert>
      )}

      <Suspense fallback={<Skeleton className="h-48 w-full" />}>
        {!hasService && barbershop && rolesData?.isOwner && (
          <Alert>
            <AlertTitle>Debes crear al menos un servicio</AlertTitle>
            <AlertDescription>
              Agrega tu primer servicio para que tus clientes puedan reservar.
              <div className="mt-2">
                <ServiceDialog
                  barbershopId={barbershop._id}
                  trigger={
                    <Button variant="outline">
                      <PlusIcon className="size-3" /> Agregar servicio
                    </Button>
                  }
                />
              </div>
            </AlertDescription>
          </Alert>
        )}
      </Suspense>

      {rolesData?.isOwner && (
        <section className="space-y-4">
          <div>
            <h2 className="font-bold text-xl tracking-tight">Disponibilidad</h2>
            <p className="text-muted-foreground text-sm">
              Define los días y horas en los que tu barbería atiende.
            </p>
          </div>

          <Suspense fallback={<Skeleton className="h-48 w-full" />}>
            {barbershop &&
              rolesData?.isOwner &&
              barbershop.availability.length > 0 && (
                <AvailabilityForm
                  barbershopId={barbershop._id}
                  availability={barbershop?.availability}
                />
              )}
          </Suspense>
        </section>
      )}
    </BorderContainer>
  );
}
