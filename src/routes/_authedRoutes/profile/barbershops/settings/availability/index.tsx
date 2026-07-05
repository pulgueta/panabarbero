import { createFileRoute, redirect } from "@tanstack/react-router";

import { AvailabilityForm } from "@/components/barbershops/availability/availability-form";
import { SettingsPageSkeleton } from "@/components/barbershops/settings/settings-page-skeleton";
import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { Card, CardContent } from "@/components/ui/card";
import { cacheTime } from "@/config/cache";
import {
  barbershopByOwnerIdQueryOptions,
  useBarbershopByOwnerId,
} from "@/hooks/barbershop/use-barbershop";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/availability/",
)({
  component: AvailabilitySettingsPage,
  pendingComponent: () => <SettingsPageSkeleton blocks={["h-[34rem]"]} />,
  ssr: "data-only",
  staticData: { breadcrumb: "Disponibilidad" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const userId = opts.context.userId;

    if (userId) {
      const barbershopMemberRoles = opts.context.dashboardRoles;

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      await opts.context.queryClient.ensureQueryData(
        barbershopByOwnerIdQueryOptions(userId),
      );
    }
  },
});

function AvailabilitySettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Disponibilidad"
          description="Define los días y horas en los que tu barbería atiende. Puedes aplicar el mismo horario a varios días o ajustarlos uno por uno."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && (
          <Card size="sm">
            <CardContent>
              <AvailabilityForm
                barbershopId={barbershop._id}
                availability={barbershop.availability}
              />
            </CardContent>
          </Card>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
