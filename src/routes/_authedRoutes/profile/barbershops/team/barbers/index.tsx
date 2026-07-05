/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to owners/staff */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
  DashboardPageStats,
} from "@/components/dashboard/dashboard-page";
import {
  InviteTeamAction,
  TeamPending,
} from "@/components/dashboard/team-page-shared";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import {
  barberScheduleQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

const MemberCard = lazy(() =>
  import("@/components/barbers/member-card").then((module) => ({
    default: module.MemberCard,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/barbers/",
)({
  component: RouteComponent,
  pendingComponent: TeamPending,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const barbershopMemberRoles = opts.context.dashboardRoles;

    if (
      !barbershop?._id ||
      (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff)
    ) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    const [barbershopMembers] = await Promise.all([
      opts.context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      ),
      opts.context.queryClient.ensureQueryData(
        servicesQueryOptions(barbershop._id),
      ),
    ]);

    for (const barbershopMember of barbershopMembers) {
      void opts.context.queryClient.prefetchQuery(
        servicesForBarberQueryOptions(barbershopMember._id),
      );
      void opts.context.queryClient.prefetchQuery(
        barberScheduleQueryOptions(barbershopMember._id),
      );
    }
  },
});

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const barberMembers =
    barbershopMembers?.filter((member) => member.roles.includes("barber")) ??
    [];
  const ownerBarbers = barberMembers.filter((member) =>
    member.roles.includes("owner"),
  ).length;
  const staffBarbers = barberMembers.length - ownerBarbers;
  const serviceCount = services?.length ?? 0;

  const isOwner = rolesData?.isOwner ?? false;
  const isStaff = rolesData?.isStaff ?? false;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Equipo"
          description="Gestiona tu equipo de barberos."
        />

        {(isOwner || isStaff) && (
          <DashboardPageActions>
            <InviteTeamAction
              barbershopId={barbershop?._id!}
              canInviteStaff={isOwner}
            />
          </DashboardPageActions>
        )}
      </DashboardPageHeader>

      <DashboardPageStats>
        <Card>
          <CardHeader>
            <CardDescription>Barberos activos</CardDescription>
            <CardTitle className="tabular-nums">
              {barberMembers.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Servicios disponibles</CardDescription>
            <CardTitle className="tabular-nums">{serviceCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardDescription>Barberos en el equipo</CardDescription>
            <CardTitle className="tabular-nums">{staffBarbers}</CardTitle>
          </CardHeader>
        </Card>
      </DashboardPageStats>

      <DashboardPageContent>
        <Suspense fallback={<ProfileTabSkeleton />}>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {services &&
              barberMembers.map((barbershopMember) => (
                <MemberCard
                  key={barbershopMember._id}
                  member={barbershopMember}
                  services={services}
                  isOwner={isOwner}
                />
              ))}
          </div>

          {barberMembers.length < 1 && (
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
      </DashboardPageContent>
    </DashboardPage>
  );
}
