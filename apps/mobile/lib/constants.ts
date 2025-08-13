import type { Theme } from "@react-navigation/native";
import { Platform } from "react-native";

export const NAV_THEME: Theme = {
  colors: {
    background: "hsl(0 0% 100%)",
    border: "hsl(214.3 31.8% 91.4%)",
    card: "hsl(0 0% 100%)",
    notification: "hsl(0 84.2% 60.2%)",
    primary: "hsl(221.2 83.2% 53.3%)",
    text: "hsl(222.2 84% 4.9%)",
  },
  dark: false,
  fonts: {
    regular: {
      fontFamily: "Geist",
      fontWeight: "400",
    },
    medium: {
      fontFamily: "Geist",
      fontWeight: "500",
    },
    bold: {
      fontFamily: "Geist",
      fontWeight: "700",
    },
    heavy: {
      fontFamily: "Geist",
      fontWeight: "900",
    },
  },
};

export const DARK_THEME: Theme = {
  colors: {
    background: "hsl(222.2 84% 4.9%)",
    border: "hsl(217.2 32.6% 17.5%)",
    card: "hsl(222.2 84% 4.9%)",
    notification: "hsl(0 62.8% 30.6%)",
    primary: "hsl(217.2 91.2% 59.8%)",
    text: "hsl(210 40% 98%)",
  },
  fonts: NAV_THEME.fonts,
  dark: true,
};

export const IS_IOS = Platform.OS === "ios";
export const IS_ANDROID = Platform.OS === "android";
