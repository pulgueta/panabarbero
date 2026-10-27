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

// Registration runs once per user per app session, even if the gated layout
// remounts. A different user on this device gets a fresh registration.
const sessionStatus = new Map<string, PushStatus>();

/** Register this device's push token with the backend. Never blocks the UI. */
export function usePushRegistration(enabled: boolean) {
  const { user, registerSignOutTask } = useAuth();
  const registerPushToken = useMutation(api.pushTokens.registerPushToken);
  const unregisterPushToken = useMutation(api.pushTokens.unregisterPushToken);
  const userId = user?.id;
  const [status, setStatus] = useState<PushStatus>(
    () => (userId && sessionStatus.get(userId)) || "pending",
  );

  useEffect(() => {
    if (!enabled || !userId) return;
    const known = sessionStatus.get(userId);
    if (known !== undefined) {
      setStatus(known);
      return;
    }
    sessionStatus.set(userId, "pending");
    setStatus("pending");

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
        sessionStatus.set(userId, next);
        setStatus(next);
      });
  }, [enabled, userId, registerPushToken]);

  // The backend keeps the token for this user until sign-out removes it, so
  // the next person on this device does not get this user's pushes.
  useEffect(() => {
    if (status !== "active" || !userId) return;
    return registerSignOutTask(async () => {
      sessionStatus.delete(userId);
      try {
        await unregisterPushToken({});
      } catch (error) {
        console.warn("Could not unregister the push token", error);
      }
      await SecureStore.deleteItemAsync(LAST_TOKEN_KEY);
    });
  }, [status, userId, registerSignOutTask, unregisterPushToken]);

  return { status };
}

export const PushStatusContext = createContext<PushStatus>("pending");

export function usePushStatus() {
  return useContext(PushStatusContext);
}
