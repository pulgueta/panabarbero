/** biome-ignore-all lint/style/noNonNullAssertion: barbershop is primed by the loader and gated to owners/staff */

import type { Barbershop } from "@convex/schema";
import { UserPlusIcon } from "@phosphor-icons/react";
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
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import {
  invitationsListQueryOptions,
  useInvitations,
} from "@/hooks/use-invitations";
import { useSession } from "@/hooks/use-session";

const InviteBarberDialog = lazy(() =>
  import("@/components/barbers/invite-barber-dialog").then((module) => ({
    default: module.InviteBarberDialog,
  })),
);

const InvitationsList = lazy(() =>
  import("@/components/barbers/invitations-list").then((module) => ({
    default: module.InvitationsList,
  })),
);

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/invitations/",
)({
  component: RouteComponent,
  pendingComponent: TeamPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Invitaciones" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const barbershopMemberRoles = opts.context.dashboardRoles;

    if (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    if (barbershop?._id) {
      await opts.context.queryClient.ensureQueryData(
        invitationsListQueryOptions(barbershop._id),
      );
    }
  },
});

function TeamPending() {
  return (
    <DashboardPage>
      <DashboardPageHeader>
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-24" />
      </DashboardPageHeader>
      <DashboardPageContent>
        <ProfileTabSkeleton />
      </DashboardPageContent>
    </DashboardPage>
  );
}

function InviteTeamAction({
  barbershopId,
  canInviteStaff,
}: {
  barbershopId: Barbershop["_id"];
  canInviteStaff: boolean;
}) {
  return (
    <Suspense
      fallback={
        <Button disabled>
          <UserPlusIcon />
          Invitar
        </Button>
      }
    >
      <InviteBarberDialog
        barbershopId={barbershopId}
        canInviteStaff={canInviteStaff}
        trigger={
          <Button>
            <UserPlusIcon />
            Invitar
          </Button>
        }
      />
    </Suspense>
  );
}

function RouteComponent() {
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.id!);
  const { data: invitations } = useInvitations(barbershop?._id!);

  const isOwner = rolesData?.isOwner ?? false;
  const isStaff = rolesData?.isStaff ?? false;
  const pendingInvitations =
    invitations?.filter((invitation) => invitation.state === "pending")
      .length ?? 0;

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Equipo"
          description="Gestiona las invitaciones pendientes de tu equipo."
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

      <DashboardPageStats className="lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardDescription>Pendientes</CardDescription>
            <CardTitle className="tabular-nums">{pendingInvitations}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total enviadas</CardDescription>
            <CardTitle className="tabular-nums">
              {invitations?.length ?? 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </DashboardPageStats>

      <DashboardPageContent>
        <Suspense fallback={<ProfileTabSkeleton />}>
          <InvitationsList barbershopId={barbershop?._id!} />
        </Suspense>
      </DashboardPageContent>
    </DashboardPage>
  );
}
