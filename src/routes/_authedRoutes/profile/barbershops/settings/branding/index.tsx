import { createFileRoute, redirect } from "@tanstack/react-router";

import { BarbershopLogoUploader } from "@/components/barbershops/barbershop-logo-uploader";
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
  "/_authedRoutes/profile/barbershops/settings/branding/",
)({
  component: BrandingSettingsPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-72"]} className="max-w-2xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Marca" },
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

function BrandingSettingsPage() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByOwnerId(user?.id ?? "");

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Marca"
          description="El logo que identifica tu barbería en la plataforma."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop && (
          <div className="max-w-2xl">
            <Card size="sm">
              <CardContent>
                <BarbershopLogoUploader
                  barbershopId={barbershop._id}
                  logoKey={barbershop.logoKey}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
