import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { useLocalSearchParams } from "expo-router";
import { Spinner, Typography } from "heroui-native";
import { View } from "react-native";

import { AppointmentDetail } from "@/components/agenda/appointment-detail";
import { useAccess } from "@/hooks/use-access";
import { useAppointment, useShopMembers } from "@/hooks/use-appointments";

export default function AppointmentScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const appointment = useAppointment(appointmentId as Id<"appointments">);
  const membership = useAccess()?.membership;

  // Barbers only open their own appointments, so the barber name is noise.
  const showBarber = !!membership && (membership.isOwner || membership.isStaff);
  const { memberName } = useShopMembers(
    showBarber ? membership.barbershopId : undefined,
  );

  if (appointment === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (appointment === null) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6">
        <Typography.Paragraph color="muted" className="text-center">
          No encontramos esta cita.
        </Typography.Paragraph>
      </View>
    );
  }

  return (
    <AppointmentDetail
      appointment={appointment}
      barberName={
        showBarber ? memberName(appointment.barbershopMemberId) : undefined
      }
    />
  );
}
