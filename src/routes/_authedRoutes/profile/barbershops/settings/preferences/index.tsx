import { createFileRoute, redirect } from "@tanstack/react-router";

import { OwnerRoleToggle } from "@/components/barbershops/settings/owner-role-toggle";
import { PreferencesForm } from "@/components/barbershops/settings/preferences-form";
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
import {
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/preferences/",
)({
  component: PreferencesSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-44", "h-36"]} className="max-w-2xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Preferencias" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershopMemberRoles = opts.context.dashboardRoles;

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      const [barbershop] = await Promise.all([
        opts.context.queryClient.ensureQueryData(
          barbershopByOwnerIdQueryOptions(userId),
        ),
        opts.context.queryClient.ensureQueryData(isBarberQueryOptions(userId)),
      ]);

      if (barbershop) {
        await opts.context.queryClient.ensureQueryData(
          barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function PreferencesSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");
  const { data: isBarber } = useIsBarber(user?.id ?? "");

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Preferencias"
          description="Ajustes operativos y tu rol dentro de la barbería."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && (
          <div className="grid max-w-2xl grid-cols-1 items-start gap-4">
            <SettingsCard
              title="Preferencias"
              description="Ajustes operativos como el periodo de gracia."
            >
              <PreferencesForm barbershop={barbershop} />
            </SettingsCard>

            <SettingsCard
              title="Tu rol"
              description="Decide si atiendes clientes como barbero o solo administras."
            >
              <OwnerRoleToggle
                barbershopId={barbershop._id}
                isCurrentlyBarber={isBarber}
              />
            </SettingsCard>
          </div>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
