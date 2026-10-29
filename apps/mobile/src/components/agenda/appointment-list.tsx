import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { Separator, Typography } from "heroui-native";
import { Fragment } from "react";
import { View } from "react-native";

import {
  AppointmentRow,
  AppointmentRowSkeleton,
} from "@/components/agenda/appointment-row";
import type { Appointment } from "@/lib/appointments";

type AppointmentListProps = {
  /** `undefined` while loading. */
  appointments: Appointment[] | undefined;
  /** Set for owner and staff; barbers see only their own appointments. */
  memberName?: (memberId: Id<"barbershopMembers">) => string;
  onOpen: (appointment: Appointment) => void;
};

const skeletonKeys = ["a", "b", "c", "d"];

/** One day's rows. Not virtualized: it lives inside the agenda ScrollView and a day is short. */
export function AppointmentList({
  appointments,
  memberName,
  onOpen,
}: AppointmentListProps) {
  if (appointments === undefined) {
    return (
      <View>
        {skeletonKeys.map((key) => (
          <AppointmentRowSkeleton key={key} />
        ))}
      </View>
    );
  }

  if (appointments.length === 0) {
    return (
      <Typography.Paragraph color="muted" className="px-5 py-10 text-center">
        Sin citas este día.
      </Typography.Paragraph>
    );
  }

  const sorted = [...appointments].sort((a, b) => a.date - b.date);

  return (
    <View>
      {sorted.map((appointment, index) => (
        <Fragment key={appointment._id}>
          {index > 0 ? <Separator className="mx-5" /> : null}
          <AppointmentRow
            appointment={appointment}
            barberName={memberName?.(appointment.barbershopMemberId)}
            onPress={() => onOpen(appointment)}
          />
        </Fragment>
      ))}
    </View>
  );
}
