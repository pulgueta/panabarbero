import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

import { stackScreenOptions } from "@/lib/stack-options";

/** Deep links to a detail (push taps, cold start) keep the agenda list below it. */
export const unstable_settings = { anchor: "index" };

export default function AgendaLayout() {
  const [foreground] = useThemeColor(["foreground"]);

  return (
    <Stack
      screenOptions={{ ...stackScreenOptions, headerTintColor: foreground }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Agenda", headerLargeTitle: true }}
      />
      <Stack.Screen
        name="[appointmentId]"
        options={{ title: "Cita", headerBackTitle: "Agenda" }}
      />
    </Stack>
  );
}
