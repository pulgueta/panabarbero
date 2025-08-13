import { QueryProvider } from "@panabarbero/client/providers";
import { DEFAULT_OPTIONS } from "@panabarbero/constants";
import { ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { preventAutoHideAsync } from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { DARK_THEME, NAV_THEME } from "@/lib/constants";

export { ErrorBoundary } from "expo-router";

preventAutoHideAsync();

const RootLayout = () => {
  const hasMounted = useRef(false);
  const [isColorSchemeLoaded, setIsColorSchemeLoaded] = useState(false);

  const { isDarkColorScheme } = useColorScheme();

  useEffect(() => {
    if (hasMounted.current) {
      return;
    }

    setIsColorSchemeLoaded(true);
    hasMounted.current = true;
  }, []);

  if (!isColorSchemeLoaded) {
    return null;
  }

  return (
    <SafeAreaView className="flex-1 bg-foreground">
      <ThemeProvider value={isDarkColorScheme ? DARK_THEME : NAV_THEME}>
        <StatusBar style="light" />
        <QueryProvider>
          <Stack screenOptions={DEFAULT_OPTIONS} />
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaView>
  );
};

export default RootLayout;
