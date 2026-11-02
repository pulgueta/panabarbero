import type { NativeStackNavigationOptions } from "expo-router";

/**
 * Shared header options for the per-tab stacks. No opaque `headerStyle`: on
 * iOS 26 the system draws the Liquid Glass header from the content behind it.
 */
export const stackScreenOptions = {
  headerTitleStyle: { fontFamily: "Geist_600SemiBold" },
  headerLargeTitleStyle: { fontFamily: "Geist_700Bold" },
  headerBackTitleStyle: { fontFamily: "Geist_400Regular" },
} satisfies NativeStackNavigationOptions;
