/** biome-ignore-all lint/style/noNonNullAssertion: Needed */

if (typeof window !== "undefined") {
  // biome-ignore lint/suspicious/noExplicitAny: Needed
  (window as any).__convexAllowFunctionsInBrowser = true;
}

import { UserPlusIcon, WarningIcon } from "@phosphor-icons/react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { z } from "zod";

import { DashboardHeaderSkeleton } from "@/components/barbershops/dashboard-header.skeleton";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cacheTime } from "@/config/cache";
import {
  barbershopByMemberUserIdQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import {
  barbershopMemberRolesQueryOptions,
  useBarbershopMemberRoles,
} from "@/hooks/barbershop/use-barbershop-member";
import { useBarbershopPlan } from "@/hooks/billing/use-plan";
import {
  barberScheduleQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  staffByBarbershopIdQueryOptions,
  useBarbershopMembersByBarbershopId,
  useStaffByBarbershopId,
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

const MemberCard = lazy(() =>
  import("@/components/barbers/member-card").then((module) => ({
    default: module.MemberCard,
  })),
);

const InviteBarberDialog = lazy(() =>
  import("@/components/barbers/invite-barber-dialog").then((module) => ({
    default: module.InviteBarberDialog,
  })),
);

const searchSchema = z.object({
  tab: z.enum(["barberos", "staff"]).default("barberos"),
});

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/",
)({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
  validateSearch: searchSchema,
  ssr: "data-only",
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
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

      // Only owner or staff can access the team page
      if (!barbershopMemberRoles?.isOwner && !barbershopMemberRoles?.isStaff) {
        throw redirect({ to: "/profile/barbershops/appointments" });
      }

      if (barbershop?._id) {
        const [barbershopMembers] = await Promise.all([
          opts.context.queryClient.ensureQueryData(
            barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
          ),
          opts.context.queryClient.ensureQueryData(
            staffByBarbershopIdQueryOptions(barbershop._id),
          ),
          opts.context.queryClient.ensureQueryData(
            servicesQueryOptions(barbershop._id),
          ),
        ]);

        if (barbershopMembers.length) {
          await Promise.all(
            barbershopMembers.flatMap((barbershopMember) => [
              opts.context.queryClient.ensureQueryData(
                servicesForBarberQueryOptions(barbershopMember._id),
              ),
              opts.context.queryClient.ensureQueryData(
                barberScheduleQueryOptions(barbershopMember._id),
              ),
            ]),
          );
        }
      }
    }
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.userId!);
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId!);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: staffMembers } = useStaffByBarbershopId(barbershop?._id!);
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);

  const { maxStaff } = useBarbershopPlan(barbershop?._id!);

  const isOwner = rolesData?.isOwner ?? false;
  const isStaff = rolesData?.isStaff ?? false;

  const staffCount = staffMembers?.length ?? 0;
  const isStaffOverLimit = maxStaff !== null && staffCount > maxStaff;

  return (
    <BorderContainer className="space-y-4">
      <section className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <Suspense fallback={<DashboardHeaderSkeleton />}>
            <DashboardHeader
              title="Equipo"
              description="Gestiona tu equipo de barberos y recepcionistas."
            />
          </Suspense>

          <Suspense
            fallback={
              <Button disabled variant="outline">
                <UserPlusIcon />
                Invitar
              </Button>
            }
          >
            {(isOwner || isStaff) && (
              <InviteBarberDialog
                canInviteStaff={isOwner}
                trigger={
                  <Button variant="outline">
                    <UserPlusIcon />
                    Invitar
                  </Button>
                }
              />
            )}
          </Suspense>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) =>
            navigate({
              search: { tab: value as "barberos" | "staff" },
            })
          }
        >
          <TabsList>
            <TabsTrigger value="barberos">Barberos</TabsTrigger>
            <TabsTrigger value="staff">Recepcionistas</TabsTrigger>
          </TabsList>

          <TabsContent value="barberos">
            <Suspense fallback={<ProfileTabSkeleton />}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {services &&
                  barbershopMembers?.map((barbershopMember) => (
                    <MemberCard
                      key={barbershopMember._id}
                      member={barbershopMember}
                      services={services}
                      isOwner={isOwner}
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
          </TabsContent>

          <TabsContent value="staff">
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
          </TabsContent>
        </Tabs>
      </section>
    </BorderContainer>
  );
}
