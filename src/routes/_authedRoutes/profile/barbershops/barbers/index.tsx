/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

if (typeof window !== "undefined") {
  // biome-ignore lint/suspicious/noExplicitAny: Needed
  (window as any).__convexAllowFunctionsInBrowser = true;
}

import { UserPlusIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import {
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";

const DashboardHeader = lazy(() =>
  import("@/components/barbershops/dashboard-header").then((module) => ({
    default: module.DashboardHeader,
  })),
);

const BarberCard = lazy(() =>
  import("@/components/barbers/barber-card").then((module) => ({
    default: module.BarberCard,
  })),
);

const InviteBarberDialog = lazy(() =>
  import("@/components/barbers/invite-barber-dialog").then((module) => ({
    default: module.InviteBarberDialog,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/barbers/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  loader: async (opts) => {
    const user = await opts.context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      const barbershop = await opts.context.queryClient.ensureQueryData(
        barbershopByMemberUserIdQueryOptions(user.userId),
      );

      const barbershopMemberRoles =
        await opts.context.queryClient.ensureQueryData(
          barbershopMemberRolesQueryOptions(user.userId),
        );

      if (!barbershopMemberRoles?.isOwner) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      if (barbershop?._id) {
        const barbershopMembers =
          await opts.context.queryClient.ensureQueryData(
            barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
          );
        await opts.context.queryClient.ensureQueryData(
          servicesQueryOptions(barbershop._id),
        );

        if (barbershopMembers.length) {
          await Promise.all(
            barbershopMembers.map((barbershopMember) =>
              opts.context.queryClient.ensureQueryData(
                servicesForBarberQueryOptions(barbershopMember._id),
              ),
            ),
          );
        }
      }
    }
  },
  ssr: "data-only",
});

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.userId!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  return (
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Suspense fallback={<DashboardHeaderSkeleton />}>
            <DashboardHeader
              title="Barberos"
              description="Gestiona tus barberos y asigna servicios a cada uno de ellos."
            />
          </Suspense>

          <Suspense
            fallback={
              <Button disabled variant="outline">
                <UserPlusIcon />
                Invitar barbero
              </Button>
            }
          >
            {rolesData?.isOwner && (
              <InviteBarberDialog
                trigger={
                  <Button variant="outline" disabled={!rolesData?.isOwner}>
                    <UserPlusIcon />
                    Invitar barbero
                  </Button>
                }
              />
            )}
          </Suspense>
        </div>

        <Suspense fallback={<ProfileTabSkeleton />}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {services &&
              barbershopMembers?.map((barbershopMember) => (
                <BarberCard
                  key={barbershopMember._id}
                  barbershopMember={barbershopMember}
                  services={services}
                  isOwner={rolesData?.isOwner ?? false}
                />
              ))}
          </div>

          {barbershopMembers?.length < 1 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No hay barberos registrados.</EmptyTitle>
                <EmptyDescription>
                  Cuando agregues barberos a tu equipo, podrás verlos aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Suspense>
      </section>
    </BorderContainer>
  );
}
