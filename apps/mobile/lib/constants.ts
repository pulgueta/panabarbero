import { Platform } from "react-native";

export const NAV_THEME = {
  light: {
    background: "hsl(var(--background))",
    border: "hsl(var(--border))",
    card: "hsl(var(--card))",
    notification: "hsl(var(--destructive))",
    primary: "hsl(var(--primary))",
    text: "hsl(var(--foreground))",
  },
  dark: {
    background: "hsl(var(--background))",
    border: "hsl(var(--border))",
    card: "hsl(var(--card))",
    notification: "hsl(var(--destructive))",
    primary: "hsl(var(--primary))",
    text: "hsl(var(--foreground))",
  },
};

export const IS_IOS = Platform.OS === "ios";
export const IS_ANDROID = Platform.OS === "android";
