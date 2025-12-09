/** biome-ignore-all lint/style/noNonNullAssertion: needed */
import type { Appointment } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { Activity, Suspense } from "react";

import { AppointmentCard } from "@/components/appointments/appointment-card";
import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { useBarbershopsByIds } from "@/hooks/barbershop/use-barbershop";

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

  const disableNext = isFetching || !hasNextPage;
  const disablePrevious = isFetching || !canGoPrevious;

  return (
    <div className="space-y-4">
      <Suspense fallback={<ProfileTabSkeleton />}>
        <Activity mode={appointments.length > 0 ? "visible" : "hidden"}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {appointments.map((appointment) => {
              const barbershop = barbershops?.find(
                (barbershop) => barbershop?._id === appointment.barbershopId,
              );

              return (
                <AppointmentCard
                  key={appointment._id}
                  appointment={appointment}
                  barbershop={barbershop!}
                  isBarber={isBarber}
                />
              );
            })}
          </div>
        </Activity>
      </Suspense>

      {appointments.length === 0 && (
        <Empty className="col-span-full">
          <EmptyTitle>No hay citas para mostrar</EmptyTitle>
          <EmptyDescription>
            Cuando agendas una cita, podrás verla aquí.
          </EmptyDescription>
        </Empty>
      )}

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
