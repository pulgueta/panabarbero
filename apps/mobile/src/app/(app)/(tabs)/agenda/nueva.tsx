import { useRouter } from "expo-router";
import { Spinner } from "heroui-native";
import { View } from "react-native";

import { CreateAppointmentForm } from "@/components/agenda/create-appointment-form";
import { EmptyState } from "@/components/ui/empty-state";
import { useCanCreateAppointment } from "@/hooks/use-create-appointment";

export default function NewAppointmentScreen() {
  const router = useRouter();
  const { membership, isLoading, canCreate, planBlocks } =
    useCanCreateAppointment();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  // The header button hides on this gate; a stale screen can still reach it.
  if (!membership || !canCreate) {
    return (
      <View className="flex-1 justify-center bg-background">
        <EmptyState
          title={
            planBlocks
              ? "Tu plan no incluye citas creadas por el equipo."
              : "No puedes crear citas en esta barbería."
          }
        />
      </View>
    );
  }

  return (
    <CreateAppointmentForm
      membership={membership}
      onSuccess={() => {
        if (router.canGoBack()) router.back();
        else router.replace("/(app)/(tabs)/agenda");
      }}
    />
  );
}
