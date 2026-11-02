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

// One registration per user per app session, shared by every mount of the
// hook: the gated layout can remount while the first attempt is in flight.
// A different user on this device gets a fresh registration.
const registrations = new Map<string, Promise<PushStatus>>();

type RegisterPushToken = (args: { token: string }) => Promise<unknown>;

async function register(
  userId: string,
  registerPushToken: RegisterPushToken,
): Promise<PushStatus> {
  const result = await getPushToken();
  if (result.token === null) return result.reason;

  // Key by user too, so a different account on this device registers again.
  const stored = `${userId}:${result.token}`;
  if ((await SecureStore.getItemAsync(LAST_TOKEN_KEY)) !== stored) {
    await registerPushToken({ token: result.token });
    await SecureStore.setItemAsync(LAST_TOKEN_KEY, stored);
  }
  return "active";
}

/** Register this device's push token with the backend. Never blocks the UI. */
export function usePushRegistration(enabled: boolean) {
  const { user } = useAuth();
  const registerPushToken = useMutation(api.pushTokens.registerPushToken);
  const userId = user?.id;
  const [status, setStatus] = useState<PushStatus>("pending");

  useEffect(() => {
    if (!enabled || !userId) return;
    let cancelled = false;

    let registration = registrations.get(userId);
    if (!registration) {
      registration = register(userId, registerPushToken).catch((error) => {
        console.warn("Could not register the push token", error);
        return "error" as const;
      });
      registrations.set(userId, registration);
    }
    registration.then((next) => {
      if (!cancelled) setStatus(next);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, userId, registerPushToken]);

  return { status };
}

/**
 * Removes this device's token from the user on sign-out, so the next person
 * on this device does not get this user's pushes. Mount it above the access
 * gate: the task must outlive a gate remount, and sign-out runs it while the
 * session is still live. A failed removal keeps the stored token, so the same
 * user skips a duplicate register next time and the next sign-out retries.
 */
export function usePushSignOutTask() {
  const { user, registerSignOutTask } = useAuth();
  const unregisterPushToken = useMutation(api.pushTokens.unregisterPushToken);
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    return registerSignOutTask(async () => {
      registrations.delete(userId);
      const stored = await SecureStore.getItemAsync(LAST_TOKEN_KEY);
      if (!stored?.startsWith(`${userId}:`)) return;
      try {
        await unregisterPushToken({});
        await SecureStore.deleteItemAsync(LAST_TOKEN_KEY);
      } catch (error) {
        console.warn("Could not unregister the push token", error);
      }
    });
  }, [userId, registerSignOutTask, unregisterPushToken]);
}

export const PushStatusContext = createContext<PushStatus>("pending");

export function usePushStatus() {
  return useContext(PushStatusContext);
}
