import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

export const ROUTE_NAMES = {
  INDEX: "index",
  ABOUT: "about",
} as const;

export const DEFAULT_OPTIONS = {
  headerShown: false,
} as const satisfies NativeStackNavigationOptions;
