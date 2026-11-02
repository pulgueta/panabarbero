import { NativeTabs } from "expo-router/native-tabs";
import { useThemeColor } from "heroui-native";
import { useSyncExternalStore } from "react";

import { useUnreadCount } from "@/hooks/use-notifications";

const labelStyle = { fontFamily: "Geist_500Medium" };

// iOS 26 minimizes the tab bar from any scroll view in the tab, and a
// screen that pops without scrolling up leaves it minimized. The behavior is
// only a host-level prop, so a focused screen can pin the bar expanded here.
let pinnedCount = 0;
const pinListeners = new Set<() => void>();
const isPinned = () => pinnedCount > 0;

/** Keeps the tab bar expanded while the calling screen is focused. */
export function pinTabBarExpanded() {
  pinnedCount += 1;
  for (const listener of pinListeners) listener();
  return () => {
    pinnedCount -= 1;
    for (const listener of pinListeners) listener();
  };
}

function subscribe(listener: () => void) {
  pinListeners.add(listener);
  return () => pinListeners.delete(listener);
}

export default function TabsLayout() {
  const [accent, accentForeground] = useThemeColor([
    "accent",
    "accent-foreground",
  ]);
  const unreadCount = useUnreadCount() ?? 0;
  const pinned = useSyncExternalStore(subscribe, isPinned, isPinned);

  return (
    <NativeTabs
      tintColor={accent}
      labelStyle={labelStyle}
      minimizeBehavior={pinned ? "never" : "onScrollDown"}
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
