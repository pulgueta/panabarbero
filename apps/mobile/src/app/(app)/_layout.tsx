import { useConvexAuth } from "convex/react";
import { Stack } from "expo-router";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { AccessGate, SessionProblem } from "@/components/access-gate";
import { useAccess } from "@/hooks/use-access";

export default function AppLayout() {
  // Bumping the key remounts the gate, so the access query subscribes again.
  const [checkKey, setCheckKey] = useState(0);

  return (
    <AccessBoundary
      key={checkKey}
      onRecheck={() => setCheckKey((key) => key + 1)}
    />
  );
}

function AccessBoundary({ onRecheck }: { onRecheck: () => void }) {
  const convexAuth = useConvexAuth();
  const access = useAccess();

  // The provider is signed in here, so "not authenticated" means Convex could
  // not get a token (offline start, WorkOS error after retries).
  if (!convexAuth.isLoading && !convexAuth.isAuthenticated) {
    return <SessionProblem />;
  }

  if (convexAuth.isLoading || access === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!access.canEnter) {
    return <AccessGate access={access} onRecheck={onRecheck} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
