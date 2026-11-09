import type { Id } from "@panabarbero/backend/convex/_generated/dataModel";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Button, Spinner, Typography } from "heroui-native";
import { View } from "react-native";

import { AppointmentActions } from "@/components/agenda/appointment-actions";
import { AppointmentDetail } from "@/components/agenda/appointment-detail";
import { useAccess } from "@/hooks/use-access";
import { useAppointment, useShopMembers } from "@/hooks/use-appointments";
import { pinTabBarExpanded } from "@/lib/tab-bar";

export default function AppointmentScreen() {
  // `action` comes from a context menu: the detail opens with that flow up.
  const { appointmentId, action } = useLocalSearchParams<{
    appointmentId: string;
    action?: string;
  }>();
  const appointment = useAppointment(appointmentId as Id<"appointments">);
  const membership = useAccess()?.membership;
  // The detail scroll must not minimize the tab bar: nothing on the agenda
  // below would expand it again.
  useFocusEffect(pinTabBarExpanded);

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

  // Soft-deleted rows keep their data; show them as unavailable.
  if (appointment === null || appointment.deletedAt) {
    return <AppointmentUnavailable message="No encontramos esta cita." />;
  }

  return (
    <AppointmentDetail
      appointment={appointment}
      barberName={
        showBarber ? memberName(appointment.barbershopMemberId) : undefined
      }
      actions={
        <AppointmentActions appointment={appointment} initialAction={action} />
      }
    />
  );
}

/** A malformed id in a link makes the query throw during render. */
export function ErrorBoundary() {
  return <AppointmentUnavailable message="No pudimos abrir esta cita." />;
}

function AppointmentUnavailable({ message }: { message: string }) {
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
      <Typography.Paragraph color="muted" className="text-center">
        {message}
      </Typography.Paragraph>
      <Button
        variant="secondary"
        onPress={() => router.dismissTo("/(app)/(tabs)/agenda")}
      >
        Volver a la agenda
      </Button>
    </View>
  );
}
