import { Stack } from "expo-router";
import { Spinner } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";

import { AccessGate } from "@/components/access-gate";
import { useAccess } from "@/hooks/use-access";
import { useNotificationNavigation } from "@/hooks/use-notification-navigation";
import {
  PushStatusContext,
  usePushRegistration,
} from "@/hooks/use-push-registration";

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
  const access = useAccess();

  if (access === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Spinner />
      </View>
    );
  }

  if (!access.canEnter) {
    return <AccessGate access={access} onRecheck={onRecheck} />;
  }

  return <GatedApp />;
}

/** Mounted only for users who passed the gate, so push work never runs for gated users. */
function GatedApp() {
  const { status } = usePushRegistration(true);
  useNotificationNavigation();

  return (
    <PushStatusContext value={status}>
      <Stack screenOptions={{ headerShown: false }} />
    </PushStatusContext>
  );
}
