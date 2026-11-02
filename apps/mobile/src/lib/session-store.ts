import * as SecureStore from "expo-secure-store";

import type { SessionUser } from "@/lib/workos";

const REFRESH_TOKEN_KEY = "pb.workos.refreshToken";
const USER_KEY = "pb.workos.user";

export async function loadSession(): Promise<{
  refreshToken: string;
  user: SessionUser | null;
} | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const rawUser = await SecureStore.getItemAsync(USER_KEY);
  let user: SessionUser | null = null;
  try {
    user = rawUser ? (JSON.parse(rawUser) as SessionUser) : null;
  } catch {
    user = null;
  }
  return { refreshToken, user };
}

export async function saveSession(refreshToken: string, user: SessionUser) {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function clearSession() {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(USER_KEY);
}
