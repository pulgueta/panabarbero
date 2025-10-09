import { expoClient } from "@better-auth/expo/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

interface AuthClientProps {
  baseURL: string;
  scheme?: string;
  storagePrefix?: string;
}

export const authClient = (opts?: AuthClientProps) =>
  createAuthClient({
    baseURL: opts?.baseURL,
    plugins: [
      expoClient({
        scheme: opts?.scheme,
        storagePrefix: opts?.storagePrefix,
        storage: SecureStore,
      }),
      convexClient(),
    ],
  });

export const { useSession, signIn, signOut } = authClient();
