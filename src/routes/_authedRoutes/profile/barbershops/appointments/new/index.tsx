/** biome-ignore-all lint/style/noNonNullAssertion: dashboard loaders gate and prime this route */

import type { BarbershopMemberWithName, Service } from "@convex/schema";
import {
  CalendarCheckIcon,
  ScissorsIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useId, useState } from "react";
import { z } from "zod";

import { CreateAppointmentForm } from "@/components/appointments/create-appointment-form";
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
import {
  barbershopAvailabilityQueryOptions,
  useBarbershopByMemberUserId,
} from "@/hooks/barbershop/use-barbershop";
import { getBarbershopPlanQueryOptions } from "@/hooks/billing/use-plan";
import {
  barberByUserIdQueryOptions,
  barbershopMembersByBarbershopIdQueryOptions,
  isBarberQueryOptions,
  isOwnerQueryOptions,
  isStaffQueryOptions,
  servicesForBarberQueryOptions,
  useBarberByUserId,
  useBarbersForService,
  useBarbershopMembersByBarbershopId,
  useIsBarber,
  useIsOwner,
  useIsStaff,
  useServicesForBarber,
} from "@/hooks/use-barbershop-members";
import { useProfile } from "@/hooks/use-profile";
import {
  servicesQueryOptions,
  useServicesByBarbershopId,
} from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";
import { formatServicePrice } from "@/lib/utils";
import { useServicesStore } from "@/store/services";

const searchSchema = z.object({
  date: z.number().optional(),
});

export const Route = createFileRoute(
  "/_authedRoutes/profile/barbershops/appointments/new/",
)({
  component: RouteComponent,
  pendingComponent: DashboardPending,
  validateSearch: searchSchema,
  ssr: "data-only",
  staticData: { breadcrumb: "Nueva cita" },
  staleTime: cacheTime.low,
  gcTime: cacheTime.medium,
  loader: async ({ context }) => {
    const userId = context.userId;
    const barbershop = context.dashboardBarbershop;
    const roles = context.dashboardRoles;

    if (!userId || !barbershop?._id) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    const isBarber = roles?.roles?.includes("barber") ?? false;
    const isStaff = roles?.isStaff ?? false;
    const isOwner = roles?.isOwner ?? false;

    const plan = await context.queryClient.ensureQueryData(
      getBarbershopPlanQueryOptions(barbershop._id),
    );

    if (
      !plan?.planLimits.staffCanCreateAppointments ||
      (!isBarber && !isStaff && !isOwner)
    ) {
      throw redirect({ to: "/profile/barbershops/appointments" });
    }

    const [members] = await Promise.all([
      context.queryClient.ensureQueryData(
        barbershopMembersByBarbershopIdQueryOptions(barbershop._id),
      ),
      context.queryClient.ensureQueryData(barberByUserIdQueryOptions(userId)),
      context.queryClient.ensureQueryData(isBarberQueryOptions(userId)),
      context.queryClient.ensureQueryData(isStaffQueryOptions(userId)),
      context.queryClient.ensureQueryData(isOwnerQueryOptions(userId)),
      context.queryClient.ensureQueryData(
        barbershopAvailabilityQueryOptions(barbershop._id),
      ),
      context.queryClient.ensureQueryData(servicesQueryOptions(barbershop._id)),
    ]);

    for (const member of members) {
      void context.queryClient.prefetchQuery(
        servicesForBarberQueryOptions(member._id),
      );
    }
  },
});

function RouteComponent() {
  const navigate = Route.useNavigate();
  const { date } = Route.useSearch();
  const { data: user } = useSession();
  const userId = user?.id ?? "";
  const { data: userProfile } = useProfile(userId);
  const { data: barbershop } = useBarbershopByMemberUserId(userId);
  const { data: barbershopMembers } = useBarbershopMembersByBarbershopId(
    barbershop?._id!,
  );
  const { data: services } = useServicesByBarbershopId(barbershop?._id!);
  const { data: isBarber } = useIsBarber(userId);
  const { data: isStaff } = useIsStaff(userId);
  const { data: isOwner } = useIsOwner(userId);
  const { data: currentBarberMember } = useBarberByUserId(userId);

  const storeServices = useServicesStore();
  const effectiveServiceId = storeServices[0]?._id as
    | Service["_id"]
    | undefined;
  const { data: barbersForService } = useBarbersForService(effectiveServiceId);
  const [selectedBarber, setSelectedBarber] = useState<
    BarbershopMemberWithName | undefined
  >(undefined);
  const { data: barberServices } = useServicesForBarber(selectedBarber?._id);

  const isCreatingOnBehalf = isBarber || isStaff || isOwner;
  const showPhoneField =
    isCreatingOnBehalf || (!isCreatingOnBehalf && !userProfile?.phoneNumber);
  const allBarbers = barbershopMembers.filter((member) =>
    member.roles.includes("barber"),
  );
  const availableBarbers = effectiveServiceId
    ? (barbersForService ?? allBarbers)
    : allBarbers;
  const selectedService = services.find(
    (nextService) => nextService._id === effectiveServiceId,
  );
  const defaultBarberId =
    isBarber && !isStaff
      ? currentBarberMember?._id
      : availableBarbers.length === 1
        ? availableBarbers[0]?._id
        : undefined;

  useEffect(() => {
    if (isBarber && !isStaff && currentBarberMember) {
      const self = barbershopMembers.find(
        (member) => member._id === currentBarberMember._id,
      );
      if (self) setSelectedBarber(self);
    }
  }, [isBarber, isStaff, currentBarberMember, barbershopMembers]);

  useEffect(() => {
    if (
      availableBarbers.length === 1 &&
      (!isCreatingOnBehalf || isStaff || (isOwner && !isBarber))
    ) {
      setSelectedBarber(availableBarbers[0]!);
    }
  }, [isCreatingOnBehalf, isStaff, isOwner, isBarber, availableBarbers]);

  const formIds = {
    customerName: useId(),
    date: useId(),
    startTime: useId(),
    contactPhone: useId(),
    contactEmail: useId(),
    notes: useId(),
    form: useId(),
    barbershopMemberId: useId(),
    serviceId: useId(),
  };

  if (!barbershop?._id) {
    return null;
  }

  return (
    <DashboardPage>
      <DashboardPageHeader>
        <DashboardPageHeading
          title="Nueva cita"
          description="Reserva un servicio para un cliente sin comprimir el formulario en un modal."
        />
        <DashboardPageActions>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/profile/barbershops/appointments" />}
          >
            Cancelar
          </Button>
        </DashboardPageActions>
      </DashboardPageHeader>

      <DashboardPageContent>
        <FormPageBody className="lg:grid-cols-1 xl:grid-cols-[minmax(0,42rem)_22rem] 2xl:grid-cols-[minmax(0,42rem)_24rem]">
          <FormPageFields>
            <CreateAppointmentForm
              barbershopId={barbershop._id}
              barbers={availableBarbers.filter((barber) => barber !== null)}
              isBarber={isCreatingOnBehalf ?? false}
              hideBarberSelector={isBarber && !isStaff}
              services={services}
              barberServices={barberServices?.filter(
                (nextService) => nextService !== null,
              )}
              onBarberChange={setSelectedBarber}
              effectiveServiceId={effectiveServiceId}
              showPhoneField={showPhoneField}
              disabledFields={
                isCreatingOnBehalf
                  ? []
                  : userProfile?.phoneNumber
                    ? ["contactEmail", "customerName", "contactPhone"]
                    : ["contactEmail", "customerName"]
              }
              formIds={formIds}
              initialValues={{
                customerName: isCreatingOnBehalf
                  ? undefined
                  : (userProfile?.name ?? undefined),
                contactPhone: isCreatingOnBehalf
                  ? undefined
                  : (userProfile?.phoneNumber ?? undefined),
                contactEmail: isCreatingOnBehalf
                  ? undefined
                  : (userProfile?.email ?? undefined),
                barbershopMemberId: defaultBarberId ?? selectedBarber?._id,
                date,
              }}
              onSuccess={() => {
                void navigate({ to: "/profile/barbershops/appointments" });
              }}
            />
          </FormPageFields>

          <FormPageAside>
            <Card size="sm">
              <CardHeader className="border-b">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <CalendarCheckIcon />
                  </span>
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      Resumen de la reserva
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      Los datos se confirmarán al guardar la cita.
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <dl className="grid gap-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Servicio</dt>
                    <dd className="max-w-40 truncate font-medium">
                      {selectedService?.name ?? "Sin seleccionar"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Duración</dt>
                    <dd className="font-medium tabular-nums">
                      {selectedService
                        ? `${selectedService.duration} min`
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Precio</dt>
                    <dd className="font-medium tabular-nums">
                      {selectedService
                        ? formatServicePrice(selectedService)
                        : "—"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Barbero</dt>
                    <dd className="max-w-40 truncate font-medium">
                      {selectedBarber?.name ?? "Por definir"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card size="sm">
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <ScissorsIcon className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {services.length} servicios activos
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <UsersIcon className="size-4 text-muted-foreground" />
                  <span className="font-medium text-sm">
                    {availableBarbers.length} barberos disponibles
                  </span>
                </div>
                <Badge variant={isCreatingOnBehalf ? "outline" : "secondary"}>
                  {isCreatingOnBehalf
                    ? "Reserva para cliente"
                    : "Reserva personal"}
                </Badge>
              </CardContent>
            </Card>
          </FormPageAside>
        </FormPageBody>
      </DashboardPageContent>
    </DashboardPage>
  );
}
