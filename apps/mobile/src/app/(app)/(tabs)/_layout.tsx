import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import { CalendarBlankIcon, UserCircleIcon } from "phosphor-react-native";

export default function TabsLayout() {
  const [accent, muted, background, border] = useThemeColor([
    "accent",
    "muted",
    "background",
    "border",
  ]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: muted,
        tabBarStyle: { backgroundColor: background, borderTopColor: border },
        tabBarLabelStyle: { fontFamily: "Geist_500Medium" },
      }}
    >
      <Tabs.Screen
        name="agenda/index"
        options={{
          title: "Agenda",
          tabBarIcon: ({ color, size }) => (
            // Tint colors come from `useThemeColor`, so they are strings.
            <CalendarBlankIcon color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: "Perfil",
          tabBarIcon: ({ color, size }) => (
            <UserCircleIcon color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
