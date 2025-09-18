import { expoClient } from "@better-auth/expo/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { createAuthClient as createBetterAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";

export interface AuthClientOptions {
  baseURL: string;
  scheme?: string | undefined;
}

export function createAuthClient(opts?: AuthClientOptions) {
  return createBetterAuthClient({
    baseURL: opts?.baseURL,
    plugins: [
      expoClient({
        scheme: opts?.scheme,
        storagePrefix: opts?.scheme,
        storage: SecureStore,
      }),
      convexClient(),
      crossDomainClient(),
    ],
  });
}
