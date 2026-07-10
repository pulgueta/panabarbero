/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to owners */

import { ShareNetworkIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { BarbershopLogoUploader } from "@/components/barbershops/barbershop-logo-uploader";
import { AddressForm } from "@/components/barbershops/settings/address-form";
import { GeneralInfoForm } from "@/components/barbershops/settings/general-info-form";
import { OwnerRoleToggle } from "@/components/barbershops/settings/owner-role-toggle";
import { PreferencesForm } from "@/components/barbershops/settings/preferences-form";
import { SettingsCard } from "@/components/barbershops/settings/settings-card";
import { SettingsPageSkeleton } from "@/components/barbershops/settings/settings-page-skeleton";
import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { Button } from "@/components/ui/button";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import { barbershopLocationQueryOptions } from "@/hooks/barbershop/use-barbershop-metadata";
import {
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { useClipboard } from "@/hooks/use-clipboard";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/",
)({
  component: ProfileSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton
      blocks={["h-52", "h-64", "h-72", "h-80", "h-44", "h-36"]}
    />
  ),
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershopMemberRoles = opts.context.dashboardRoles;

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      await opts.context.queryClient
        .ensureQueryData(barbershopByOwnerIdQueryOptions(userId))
        .then((barbershop) => {
          if (!barbershop?._id) return;

          void opts.context.queryClient.prefetchQuery(
            barbershopLocationQueryOptions(barbershop._id),
          );
          void opts.context.queryClient.prefetchQuery(
            barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
          );
        });

      void opts.context.queryClient.prefetchQuery(isBarberQueryOptions(userId));
    }
  },
});

function ProfileSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");
  const { data: isBarber } = useIsBarber(user?.id ?? "");
  const [copy] = useClipboard();
  const { trigger } = useWebHaptics();

  const onCopyLink = () => {
    if (!barbershop) return;

    const url = `${window.location.origin}/barbershops/${barbershop.uuid}`;

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
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Ajustes"
          description="Administra el perfil público, la ubicación y la operación de tu barbería."
        />

        {barbershop && (
          <DashboardPageActions>
            <Button variant="outline" onClick={onCopyLink}>
              <ShareNetworkIcon weight="bold" />
              Copiar link
            </Button>
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SettingsCard
              title="Información general"
              description="Nombre y descripción pública de tu barbería."
            >
              <GeneralInfoForm barbershop={barbershop} />
            </SettingsCard>

            <SettingsCard
              title="Dirección"
              description="Dirección, ciudad y departamento."
            >
              <AddressForm barbershop={barbershop} />
            </SettingsCard>

            <SettingsCard
              title="Preferencias"
              description="Ajustes operativos como el periodo de gracia."
            >
              <PreferencesForm barbershop={barbershop} />
            </SettingsCard>

            <SettingsCard
              title="Logo"
              description="Imagen que identifica tu barbería en la plataforma."
            >
              <BarbershopLogoUploader
                barbershopId={barbershop._id}
                logoKey={barbershop.logoKey}
              />
            </SettingsCard>

            <SettingsCard
              title="Tu rol"
              description="Decide si también atiendes clientes como barbero."
            >
              <OwnerRoleToggle
                barbershopId={barbershop._id}
                isCurrentlyBarber={isBarber ?? false}
              />
            </SettingsCard>
          </div>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
