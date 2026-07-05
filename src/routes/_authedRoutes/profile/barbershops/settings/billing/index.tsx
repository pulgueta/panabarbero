/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to owners */

import { createFileRoute, redirect } from "@tanstack/react-router";

import { BillingPlanCard } from "@/components/barbershops/settings/billing-plan-card";
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
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/billing/",
)({
  component: BillingSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-52", "h-52"]} className="max-w-5xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Facturación" },
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
          getBarbershopPlanQueryOptions(barbershop._id),
        );
      }
    }
  },
});

function BillingSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Facturación"
          description="Tu plan actual y la gestión de tu suscripción."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && <BillingPlanCard barbershopId={barbershop._id} />}
      </DashboardPageContent>
    </DashboardPage>
  );
}
