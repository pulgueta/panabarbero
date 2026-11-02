import { Stack, useRouter } from "expo-router";
import { Typography, useThemeColor } from "heroui-native";
import { Platform, Pressable } from "react-native";

import { useCanCreateAppointment } from "@/hooks/use-create-appointment";
import { stackScreenOptions } from "@/lib/stack-options";

/** Deep links to a detail (push taps, cold start) keep the agenda list below it. */
export const unstable_settings = { anchor: "index" };

export default function AgendaLayout() {
  const [foreground] = useThemeColor(["foreground"]);
  const router = useRouter();
  const { canCreate } = useCanCreateAppointment();
  const openNew = () => router.push("/(app)/(tabs)/agenda/nueva");

  return (
    <Stack
      screenOptions={{ ...stackScreenOptions, headerTintColor: foreground }}
    >
      {/* A fixed card layout, not a scroll: an inline title keeps the room, and the
          screen pads itself by the header height on every platform. */}
      <Stack.Screen
        name="index"
        options={{
          title: "Agenda",
          headerTransparent: true,
          // iOS gets the native toolbar button below (glass on iOS 26); Android
          // lacks `@expo/ui`, which `Stack.Toolbar` needs there.
          headerRight:
            Platform.OS !== "ios" && canCreate
              ? () => (
                  <Pressable
                    accessibilityRole="button"
                    onPress={openNew}
                    hitSlop={8}
                  >
                    <Typography weight="medium" className="text-link">
                      Nueva
                    </Typography>
                  </Pressable>
                )
              : undefined,
        }}
      >
        {Platform.OS === "ios" && canCreate ? (
          <Stack.Toolbar placement="right">
            <Stack.Toolbar.Button
              accessibilityLabel="Nueva cita"
              onPress={openNew}
            >
              Nueva
            </Stack.Toolbar.Button>
          </Stack.Toolbar>
        ) : null}
      </Stack.Screen>
      <Stack.Screen
        name="[appointmentId]"
        options={{ title: "Cita", headerBackTitle: "Agenda" }}
      />
      <Stack.Screen
        name="nueva"
        options={{ title: "Nueva cita", headerBackTitle: "Agenda" }}
      />
    </Stack>
  );
}
