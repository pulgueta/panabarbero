import { NativeTabs } from "expo-router/native-tabs";
import { useThemeColor } from "heroui-native";

import { useUnreadCount } from "@/hooks/use-notifications";

const labelStyle = { fontFamily: "Geist_500Medium" };

export default function TabsLayout() {
  const [accent, accentForeground] = useThemeColor([
    "accent",
    "accent-foreground",
  ]);
  const unreadCount = useUnreadCount() ?? 0;

  return (
    <NativeTabs
      tintColor={accent}
      labelStyle={labelStyle}
      minimizeBehavior="onScrollDown"
      badgeBackgroundColor={accent}
      badgeTextColor={accentForeground}
    >
      <NativeTabs.Trigger name="agenda">
        <NativeTabs.Trigger.Icon sf="calendar" md="calendar_month" />
        <NativeTabs.Trigger.Label>Agenda</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="notificaciones">
        <NativeTabs.Trigger.Icon
          sf={unreadCount > 0 ? "bell.badge" : "bell"}
          md="notifications"
        />
        <NativeTabs.Trigger.Label>Notificaciones</NativeTabs.Trigger.Label>
        {unreadCount > 0 ? (
          <NativeTabs.Trigger.Badge>
            {unreadCount > 99 ? "99+" : String(unreadCount)}
          </NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="account_circle" />
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
