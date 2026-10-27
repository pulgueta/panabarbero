/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to owners/staff */

import { WarningIcon } from "@phosphor-icons/react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  getBarbershopPlanQueryOptions,
  useBarbershopPlan,
} from "@/hooks/billing/use-plan";
import {
  staffByBarbershopIdQueryOptions,
  useStaffByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";

const MemberCard = lazy(() =>
  import("@/components/barbers/member-card").then((module) => ({
    default: module.MemberCard,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/receptionists/",
)({
  component: RouteComponent,
  pendingComponent: TeamPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Recepcionistas" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const barbershopMemberRoles = opts.context.dashboardRoles;

    if (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      await Promise.all([
        opts.context.queryClient.ensureQueryData(
          staffByBarbershopIdQueryOptions(barbershop._id),
        ),
        opts.context.queryClient.ensureQueryData(
          getBarbershopPlanQueryOptions(barbershop._id),
        ),
      ]);
    }
  },
});

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: staffMembers } = useStaffByBarbershopId(barbershop?._id!);

  const { maxStaff } = useBarbershopPlan(barbershop?._id!);

  const isOwner = rolesData?.isOwner ?? false;
  const isStaff = rolesData?.isStaff ?? false;

  const staffCount = staffMembers?.length ?? 0;
  const isStaffOverLimit = maxStaff !== null && staffCount > maxStaff;
  const staffSlots =
    maxStaff === null ? "Ilimitados" : Math.max(maxStaff - staffCount, 0);

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Equipo"
          description="Gestiona tu equipo de recepcionistas."
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
            <CardDescription>Recepcionistas</CardDescription>
            <CardTitle className="tabular-nums">{staffCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Límite del plan</CardDescription>
            <CardTitle className="tabular-nums">
              {maxStaff ?? "Ilimitado"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader>
            <CardDescription>Cupos disponibles</CardDescription>
            <CardTitle className="tabular-nums">{staffSlots}</CardTitle>
          </CardHeader>
        </Card>
      </DashboardPageStats>

      <DashboardPageContent>
        <Suspense fallback={<ProfileTabSkeleton />}>
          {isStaffOverLimit && isOwner && (
            <Alert variant="destructive" className="mb-4">
              <WarningIcon className="size-4" />
              <AlertTitle>Límite de recepcionistas excedido</AlertTitle>
              <AlertDescription>
                Tu plan permite {maxStaff}{" "}
                {maxStaff === 1 ? "recepcionista" : "recepcionistas"} pero
                tienes {staffCount}. Mejora tu plan o elimina miembros para
                cumplir con el límite.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {staffMembers?.map((staffMember) => (
              <MemberCard
                key={staffMember._id}
                member={staffMember}
                isOwner={isOwner}
              />
            ))}
          </div>

          {staffMembers?.length < 1 && (
            <Empty>
              <EmptyHeader>
                <EmptyTitle>No hay recepcionistas registrados.</EmptyTitle>
                <EmptyDescription>
                  Cuando agregues recepcionistas a tu equipo, podrás verlos
                  aquí.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </Suspense>
      </DashboardPageContent>
    </DashboardPage>
  );
}
