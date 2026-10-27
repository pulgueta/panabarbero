import { api } from "@panabarbero/backend/convex/_generated/api";
import { useMutation } from "convex/react";
import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

import { getPushToken } from "@/lib/push";
import { useAuth } from "@/providers/auth-provider";

const LAST_TOKEN_KEY = "pb.push.lastToken";

export type PushStatus =
  | "pending"
  | "active"
  | "simulator"
  | "denied"
  | "no-project-id"
  | "error";

// Registration runs once per app session, even if the gated layout remounts.
let sessionStatus: PushStatus | null = null;

/** Register this device's push token with the backend. Never blocks the UI. */
export function usePushRegistration(enabled: boolean) {
  const { user } = useAuth();
  const registerPushToken = useMutation(api.pushTokens.registerPushToken);
  const [status, setStatus] = useState<PushStatus>(sessionStatus ?? "pending");
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !userId || sessionStatus !== null) return;
    sessionStatus = "pending";

    const register = async (): Promise<PushStatus> => {
      const result = await getPushToken();
      if (result.token === null) return result.reason;

      // Key by user too, so a different account on this device registers again.
      const stored = `${userId}:${result.token}`;
      if ((await SecureStore.getItemAsync(LAST_TOKEN_KEY)) !== stored) {
        await registerPushToken({ token: result.token });
        await SecureStore.setItemAsync(LAST_TOKEN_KEY, stored);
      }
      return "active";
    };

    register()
      .catch((error) => {
        console.warn("Could not register the push token", error);
        return "error" as const;
      })
      .then((next) => {
        sessionStatus = next;
        setStatus(next);
      });
  }, [enabled, userId, registerPushToken]);

  return { status };
}

export const PushStatusContext = createContext<PushStatus>("pending");

export function usePushStatus() {
  return useContext(PushStatusContext);
}
