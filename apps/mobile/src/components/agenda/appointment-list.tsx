import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { Separator, Typography } from "heroui-native";
import { FlatList, View } from "react-native";

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

  const sorted = [...appointments].sort((a, b) => a.date - b.date);

  return (
    <FlatList
      data={sorted}
      keyExtractor={(appointment) => appointment._id}
      renderItem={({ item }) => (
        <AppointmentRow
          appointment={item}
          barberName={memberName?.(item.barbershopMemberId)}
          onPress={() => onOpen(item)}
        />
      )}
      ItemSeparatorComponent={() => <Separator className="mx-5" />}
      ListEmptyComponent={
        <Typography.Paragraph color="muted" className="px-5 py-10 text-center">
          Sin citas este día.
        </Typography.Paragraph>
      }
    />
  );
}
