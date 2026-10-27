import "../global.css";

import { Geist_400Regular } from "@expo-google-fonts/geist/400Regular";
import { Geist_500Medium } from "@expo-google-fonts/geist/500Medium";
import { Geist_600SemiBold } from "@expo-google-fonts/geist/600SemiBold";
import { Geist_700Bold } from "@expo-google-fonts/geist/700Bold";
import { ConvexProviderWithAuth } from "convex/react";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { HeroUINativeProvider } from "heroui-native";
import { IconContext } from "phosphor-react-native";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { convex } from "@/lib/convex";
import { configureNotificationHandler } from "@/lib/push";
import {
  AuthProvider,
  useAuth,
  useWorkosConvexAuth,
} from "@/providers/auth-provider";
import { ThemeProvider } from "@/providers/theme-provider";

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
                  <RootNavigator fontsReady={fontsReady} />
                </IconContext.Provider>
              </ConvexProviderWithAuth>
            </AuthProvider>
          </HeroUINativeProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
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
