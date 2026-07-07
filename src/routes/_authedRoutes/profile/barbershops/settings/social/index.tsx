/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to members */

import { createFileRoute, redirect } from "@tanstack/react-router";
import type { FC } from "react";
import { SettingsCard } from "@/components/barbershops/settings/settings-card";
import { SettingsPageSkeleton } from "@/components/barbershops/settings/settings-page-skeleton";
import { SocialMediaForm } from "@/components/barbershops/settings/social-media-form";
import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { cacheTime } from "@/config/cache";
import {
  barbershopMetadataQueryOptions,
  useBarbershopMetadata,
} from "@/hooks/barbershop/use-barbershop-metadata";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/settings/social/",
)({
  component: SocialMediaPage,
  pendingComponent: () => (
    <SettingsPageSkeleton blocks={["h-96"]} className="max-w-2xl" />
  ),
  ssr: "data-only",
  staticData: { breadcrumb: "Redes sociales" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;

    // Managing the public profile is owner/staff work — barbers land on Citas.
    if (!roles?.isOwner && !roles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      await opts.context.queryClient.ensureQueryData(
        barbershopMetadataQueryOptions(barbershop._id),
      );
    }
  },
});

const NoBarbershop: FC = () => (
  <Empty>
    <EmptyHeader>
      <EmptyTitle>No tienes una barbería asociada.</EmptyTitle>
      <EmptyDescription>
        Crea o únete a una barbería para administrar sus redes sociales.
      </EmptyDescription>
    </EmptyHeader>
  </Empty>
);

function SocialMediaPage() {
  const { barbershop, isOwner } = Route.useRouteContext({
    select: (context) => ({
      barbershop: context.dashboardBarbershop,
      isOwner: context.dashboardRoles?.isOwner ?? false,
    }),
  });
  const { data: metadata } = useBarbershopMetadata(barbershop?._id!);

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Redes sociales"
          description="Conecta los perfiles públicos de tu barbería para que tus clientes te encuentren."
        />
      </DashboardPageHeader>

      <DashboardPageContent>
        {barbershop?._id ? (
          <div className="max-w-2xl">
            <SettingsCard
              title="Perfiles"
              description="Agrega o actualiza los enlaces a tus redes sociales."
            >
              <SocialMediaForm
                barbershopId={barbershop._id}
                socialMedia={metadata?.socialMedia ?? []}
                canDelete={isOwner}
              />
            </SettingsCard>
          </div>
        ) : (
          <NoBarbershop />
        )}
      </DashboardPageContent>
    </DashboardPage>
  );
}
