/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import type { Appointment } from "@convex/tables";
import type { FC } from "react";
import { lazy, Suspense } from "react";

import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useBarbershopsByIds } from "@/hooks/barbershop/use-barbershop";
import { useServicesByIds } from "@/hooks/use-services";

const AppointmentCard = lazy(() =>
  import("@/components/appointments/appointment-card").then((module) => ({
    default: module.AppointmentCard,
  })),
);

interface AppointmentsTabProps {
  appointments: Appointment[];
  hasNextPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  canGoPrevious: boolean;
  isFetching: boolean;
  isBarber: boolean;
}

export const AppointmentsTab: FC<AppointmentsTabProps> = ({
  appointments,
  hasNextPage,
  onNextPage,
  onPreviousPage,
  canGoPrevious,
  isFetching,
  isBarber,
}) => {
  const { data: barbershops } = useBarbershopsByIds(
    appointments.map((appointment) => appointment.barbershopId),
  );

  const { data: services } = useServicesByIds(
    appointments.map((appointment) => appointment.serviceId),
  );

  const disableNext = isFetching || !hasNextPage;
  const disablePrevious = isFetching || !canGoPrevious;

  return (
    <div className="space-y-4">
      <Suspense fallback={<ProfileTabSkeleton />}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {appointments.map((appointment) => {
            const barbershop = barbershops?.find(
              (barbershop) => barbershop?._id === appointment.barbershopId,
            );
            const service = services?.find(
              (service) => service?._id === appointment.serviceId,
            );

            return (
              <AppointmentCard
                key={appointment._id}
                appointment={appointment}
                barbershop={barbershop!}
                isBarber={isBarber}
                service={service!}
              />
            );
          })}
        </div>

        {appointments.length === 0 && (
          <Empty className="col-span-full">
            <EmptyTitle>No hay citas para mostrar</EmptyTitle>
            <EmptyDescription>
              Cuando agendas una cita, podrás verla aquí.
            </EmptyDescription>
          </Empty>
        )}
      </Suspense>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={onPreviousPage}
          disabled={disablePrevious}
        >
          Anterior
        </Button>
        <Button onClick={onNextPage} disabled={disableNext}>
          Siguiente
        </Button>
      </div>
    </div>
  );
};
