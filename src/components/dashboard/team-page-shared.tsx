import type { Barbershop } from "@convex/schema";
import { UserPlusIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { lazy, Suspense } from "react";

import {
  DashboardPage,
  DashboardPageContent,
  DashboardPageHeader,
} from "@/components/dashboard/dashboard-page";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const InviteBarberDialog = lazy(() =>
  import("@/components/barbers/invite-barber-dialog").then((module) => ({
    default: module.InviteBarberDialog,
  })),
);

/** Shared pending state for the team routes (barbers / receptionists / invitations). */
export const TeamPending: FC = () => {
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
};

interface InviteTeamActionProps {
  barbershopId: Barbershop["_id"];
  canInviteStaff: boolean;
}

/** "Invitar" header action shared by the team routes; lazy-loads the dialog. */
export const InviteTeamAction: FC<InviteTeamActionProps> = ({
  barbershopId,
  canInviteStaff,
}) => {
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
};
