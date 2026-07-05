import { createFileRoute, redirect } from "@tanstack/react-router";

import { AddressForm } from "@/components/barbershops/settings/address-form";
import { LocationForm } from "@/components/barbershops/settings/location-form";
import { SettingsCard } from "@/components/barbershops/settings/settings-card";
import { SettingsPageSkeleton } from "@/components/barbershops/settings/settings-page-skeleton";
import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import { barbershopLocationQueryOptions } from "@/hooks/barbershop/use-barbershop-metadata";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/location/",
)({
  component: LocationSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-56", "h-96"]} className="max-w-2xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Ubicación" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershopMemberRoles = opts.context.dashboardRoles;

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(userId),
      );

      if (barbershop) {
        await opts.context.queryClient.ensureQueryData(
          barbershopLocationQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function LocationSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Ubicación"
          description="Dónde está tu barbería y su punto exacto en el mapa."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && (
          <div className="grid max-w-2xl grid-cols-1 items-start gap-4">
            <SettingsCard
              title="Dirección"
              description="Dirección, ciudad y departamento."
            >
              <AddressForm barbershop={barbershop} />
            </SettingsCard>

            <SettingsCard
              title="Ubicación en el mapa"
              description="Fija el punto exacto de tu barbería para que tus clientes te encuentren."
            >
              <LocationForm barbershop={barbershop} />
            </SettingsCard>
          </div>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
