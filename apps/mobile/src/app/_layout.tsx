import "../global.css";

import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { ConvexProviderWithAuth } from "convex/react";
import { useFonts } from "expo-font";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
  Stack,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider, useThemeColor } from "heroui-native";
import { IconContext } from "phosphor-react-native";
import { type ReactNode, useEffect, useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";

import { convex } from "@/lib/convex";
import { configureNotificationHandler } from "@/lib/push";
import {
  AuthProvider,
  useAuth,
  useWorkosConvexAuth,
} from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export { RootError as ErrorBoundary } from "@/components/root-error";

SplashScreen.preventAutoHideAsync();
configureNotificationHandler();

const iconContext = { weight: "bold" } as const;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  const fontsReady = fontsLoaded || fontError !== null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <HeroUINativeProvider>
            <AuthProvider>
              <ConvexProviderWithAuth
                client={convex}
                useAuth={useWorkosConvexAuth}
              >
                <IconContext.Provider value={iconContext}>
                  <StatusBar style="auto" />
                  <NavigationTheme>
                    <RootNavigator fontsReady={fontsReady} />
                  </NavigationTheme>
                </IconContext.Provider>
              </ConvexProviderWithAuth>
            </AuthProvider>
          </HeroUINativeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Hands the resolved Uniwind palette to React Navigation. Screen backgrounds
 * and the headers that are not Liquid Glass (Android, older iOS) otherwise
 * stay light in dark mode. Glass headers ignore `card`, so iOS 26 is unchanged.
 */
function NavigationTheme({ children }: { children: ReactNode }) {
  const { theme } = useUniwind();
  const [accent, background, surface, foreground, border, danger] =
    useThemeColor([
      "accent",
      "background",
      "surface",
      "foreground",
      "border",
      "danger",
    ]);

  const value = useMemo(
    () => ({
      ...(theme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        primary: accent,
        background,
        card: surface,
        text: foreground,
        border,
        notification: danger,
      },
    }),
    [theme, accent, background, surface, foreground, border, danger],
  );

  return (
    <NavigationThemeProvider value={value}>{children}</NavigationThemeProvider>
  );
}

function RootNavigator({ fontsReady }: { fontsReady: boolean }) {
  const { status } = useAuth();
  const ready = fontsReady && status !== "loading";

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // The native splash stays visible until fonts and the stored session resolve.
  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={status === "signedIn"}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === "signedOut"}>
        <Stack.Screen name="(auth)/sign-in" />
      </Stack.Protected>
    </Stack>
  );
}
