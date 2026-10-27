/** biome-ignore-all lint/style/noNonNullAssertion: route loader gates and primes the member data */

import type { BarbershopMember, Service } from "@convex/schema";
import { ScissorsIcon, UserIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";

import { ManageServicesEditor } from "@/components/barbers/manage-services-dialog";
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
  barbershopMembersByBarbershopIdQueryOptions,
  servicesForBarberQueryOptions,
  useBarbershopMembersByBarbershopId,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import {
  servicesQueryOptions,
  useServicesFromBarbershop,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";

function isService(service: Service | null): service is Service {
  return service !== null;
}

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/team/barbers/$memberId/services/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  ssr: "data-only",
  staticData: { breadcrumb: "Servicios del barbero" },
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
        servicesQueryOptions(barbershop._id),
      ),
      opts.context.queryClient.ensureQueryData(
        servicesForBarberQueryOptions(memberId),
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
  const { data: services } = useServicesFromBarbershop(barbershop?._id!);
  const { data: currentServices } = useServicesForBarber(typedMemberId);
  const member = members.find((row) => row._id === typedMemberId);
  const activeServices = currentServices?.filter(isService) ?? [];

  if (!member || !barbershop?._id) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Servicios del barbero"
          description={`Define qué servicios puede atender ${member.name}.`}
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
        <FormPageBody className="lg:grid-cols-[minmax(0,42rem)_22rem] xl:grid-cols-[minmax(0,42rem)_24rem]">
          <FormPageFields>
            <ManageServicesEditor
              barbershopMember={member}
              services={services}
              currentServices={activeServices}
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
                    <Badge variant="outline">Barbero</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">
                      Servicios asignados
                    </dt>
                    <dd className="font-medium tabular-nums">
                      {activeServices.length}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Servicios creados</dt>
                    <dd className="font-medium tabular-nums">
                      {services.length}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <ScissorsIcon className="size-4 text-muted-foreground" />
                  <p className="font-medium text-sm">
                    Disponibilidad comercial
                  </p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Solo los servicios marcados aparecerán para este barbero al
                  reservar una cita.
                </p>
              </CardContent>
            </Card>
          </FormPageAside>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
}
