import type { ErrorBoundaryProps } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";

/**
 * Last-resort screen for a render error in any route. It replaces the root
 * layout, so it runs without the app providers: plain views only.
 */
export function RootError({ retry }: ErrorBoundaryProps) {
  // The error can happen before the root layout hides the native splash.
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <View className="flex-1 items-center justify-center gap-2 bg-background px-6">
      <StatusBar style="auto" />
      <Text
        accessibilityRole="header"
        className="text-center font-semibold text-foreground text-xl"
      >
        Algo salió mal
      </Text>
      <Text className="text-center text-base text-muted">
        No pudimos mostrar esta pantalla.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        className="mt-4 min-h-12 items-center justify-center rounded-xl bg-accent px-6"
      >
        <Text className="font-medium text-accent-foreground text-base">
          Reintentar
        </Text>
      </Pressable>
    </View>
  );
}
