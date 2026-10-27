/** biome-ignore-all lint/style/noNonNullAssertion: route loader gates and primes the member data */

import type { BarbershopMember } from "@convex/schema";
import { ClockIcon, UserIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { BarberScheduleEditor } from "@/components/barbershops/availability/barber-schedule-dialog";
import {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
} from "@/components/dashboard/dashboard-page";
import { DashboardPending } from "@/components/dashboard/dashboard-pending";
import {
  FormPageAside,
  FormPageBody,
  FormPageFields,
} from "@/components/form/form-page";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cacheTime } from "@/config/cache";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import {
  barberScheduleQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  useBarbershopMembersByBarbershopId,
} from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/barbers/$memberId/schedule/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Horario del barbero" },
  staleTime: cacheTime.high,
  gcTime: cacheTime.extreme,
  loader: async (opts) => {
    const barbershop = opts.context.dashboardBarbershop;
    const roles = opts.context.dashboardRoles;
    const memberId = opts.params.memberId as BarbershopMember["_id"];

    if (!barbershop?._id || (!roles?.isOwner && !roles?.isStaff)) {
      throw redirect({ to: "/profile/barbershops/team/barbers" });
    }

    const [members] = await Promise.all([
      opts.context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      ),
      opts.context.queryClient.ensureQueryData(
        barberScheduleQueryOptions(memberId),
      ),
    ]);

    const member = members.find((row) => row._id === memberId);

    if (!member?.roles.includes("barber")) {
      throw redirect({ to: "/profile/barbershops/team/barbers" });
    }
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { memberId } = Route.useParams();
  const typedMemberId = memberId as BarbershopMember["_id"];
  const { data: user } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(user?.id!);
  const { data: members } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const member = members.find((row) => row._id === typedMemberId);

  if (!member) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Horario del barbero"
          description={`Configura el horario personalizado de ${member.name}.`}
        />
        <DashboardPageActions>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/profile/barbershops/team/barbers" />}
          >
            Volver
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>

      <DashboardPageContent>
        <FormPageBody className="lg:grid-cols-[minmax(0,52rem)_22rem] xl:grid-cols-[minmax(0,52rem)_24rem]">
          <FormPageFields className="max-w-4xl">
            <BarberScheduleEditor
              member={member}
              onCancel={() =>
                void navigate({ to: "/profile/barbershops/team/barbers" })
              }
              onSuccess={() =>
                void navigate({ to: "/profile/barbershops/team/barbers" })
              }
            />
          </FormPageFields>

          <FormPageAside>
            <Card size="sm">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <UserIcon />
                  </span>
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="truncate text-base">
                      {member.name}
                    </CardTitle>
                    <Badge variant="outline">Horario individual</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-muted-foreground text-sm">
                  Si desactivas el horario personalizado, este barbero vuelve a
                  usar la disponibilidad general de la barbería.
                </p>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Regla de reserva</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Los clientes solo verán horarios donde el servicio, el día y
                  la disponibilidad del barbero coincidan.
                </p>
              </CardContent>
            </Card>
          </FormPageAside>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
}
