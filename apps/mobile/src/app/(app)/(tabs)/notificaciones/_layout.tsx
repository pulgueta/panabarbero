import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

import { stackScreenOptions } from "@/lib/stack-options";

export default function NotificationsLayout() {
  const [foreground] = useThemeColor(["foreground"]);

  return (
    <Stack
      screenOptions={{ ...stackScreenOptions, headerTintColor: foreground }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Notificaciones", headerLargeTitle: true }}
      />
    </Stack>
  );
}
