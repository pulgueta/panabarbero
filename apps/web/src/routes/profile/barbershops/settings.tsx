/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is guaranteed to be not null */
import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { AvailabilityForm } from "@/components/barbershops/availability/availability-form";
import { ServiceDialog } from "@/components/barbershops/services/service-dialog";
import { AddressForm } from "@/components/barbershops/settings/address-form";
import { GeneralInfoForm } from "@/components/barbershops/settings/general-info-form";
import { PreferencesForm } from "@/components/barbershops/settings/preferences-form";
import { SocialMediaForm } from "@/components/barbershops/settings/social-media-form";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMetadataQueryOptions,
  useBarbershopMetadata,
} from "@/hooks/barbershop/use-barbershop-metadata";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/settings")({
  component: SettingsPage,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(user.userId),
      );

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
  const { data: user } = useSession();

  const { data: barbershop } = useBarbershopByOwnerId(user?.userId!);
  const { data: barbershopMetadata } = useBarbershopMetadata(barbershop?._id!);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  const hasService = services?.length && services.length > 0;
  const hasAnyActiveDay = barbershop?.availability?.some(
    (a) => a.weekDay.isActive,
  );

  return (
    <BorderContainer className="space-y-6">
      <header>
        <h1 className="text-balance font-bold text-3xl tracking-tight">
          Configuración de barbería
        </h1>
      </header>

      {barbershop && (
        <>
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

              <GeneralInfoForm barbershop={barbershop} />
            </div>

            <div className="space-y-2">
              <header>
                <h2 className="font-bold text-xl tracking-tight">Dirección</h2>
                <p className="text-muted-foreground text-sm">
                  Dirección, ciudad y departamento.
                </p>
              </header>

              <AddressForm barbershop={barbershop} />
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

              <PreferencesForm barbershop={barbershop} />
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

              <SocialMediaForm
                barbershop={barbershop}
                barbershopMetadata={barbershopMetadata!}
              />
            </section>
          </section>

          <Separator />
        </>
      )}

      {!hasAnyActiveDay && (
        <Alert variant="warning">
          <AlertTitle>Horario de atención requerido</AlertTitle>
          <AlertDescription>
            Configura el horario de apertura y cierre de tu barbería. Puedes
            aplicar los mismos horarios a varios días o establecerlos uno por
            uno.
          </AlertDescription>
        </Alert>
      )}

      {!hasService && barbershop && (
        <Alert variant="warning">
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

      <section className="space-y-4">
        <div>
          <h2 className="font-bold text-xl tracking-tight">Disponibilidad</h2>
          <p className="text-muted-foreground text-sm">
            Define los días y horas en los que tu barbería atiende.
          </p>
        </div>

        {barbershop && barbershop.availability.length > 0 && (
          <AvailabilityForm
            barbershopId={barbershop._id}
            availability={barbershop?.availability}
          />
        )}
      </section>
    </BorderContainer>
  );
}
