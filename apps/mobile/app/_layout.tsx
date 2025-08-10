import { DEFAULT_OPTIONS } from "@panabarbero/constants";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { hide, preventAutoHideAsync } from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

preventAutoHideAsync();

const RootLayout = () => {
  const [loaded] = useFonts({
    Geist: require("../assets/fonts/Geist-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      hide();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={DEFAULT_OPTIONS} />
    </SafeAreaProvider>
  );
};

export default RootLayout;
