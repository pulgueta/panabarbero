import { Tabs } from "expo-router";
import { useThemeColor } from "heroui-native";
import {
  BellIcon,
  CalendarBlankIcon,
  UserCircleIcon,
} from "phosphor-react-native";

import { useUnreadCount } from "@/hooks/use-notifications";

export default function TabsLayout() {
  const [accent, accentForeground, muted, background, border] = useThemeColor([
    "accent",
    "accent-foreground",
    "muted",
    "background",
    "border",
  ]);
  const unreadCount = useUnreadCount() ?? 0;

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
        name="notificaciones"
        options={{
          title: "Notificaciones",
          tabBarIcon: ({ color, size }) => (
            <BellIcon color={color as string} size={size} />
          ),
          tabBarBadge:
            unreadCount > 0
              ? unreadCount > 99
                ? "99+"
                : unreadCount
              : undefined,
          tabBarBadgeStyle: {
            backgroundColor: accent,
            color: accentForeground,
            fontFamily: "Geist_500Medium",
          },
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
