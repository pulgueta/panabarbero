import { Stack } from "expo-router";
import { useThemeColor } from "heroui-native";

import { stackScreenOptions } from "@/lib/stack-options";

export default function ProfileLayout() {
  const [foreground] = useThemeColor(["foreground"]);

  return (
    <Stack
      screenOptions={{ ...stackScreenOptions, headerTintColor: foreground }}
    >
      <Stack.Screen
        name="index"
        options={{ title: "Perfil", headerLargeTitle: true }}
      />
    </Stack>
  );
}
