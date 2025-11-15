import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { env } from "@panabarbero/web/env";
import { passkeyClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: env.VITE_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    passkeyClient(),
    twoFactorClient(),
    crossDomainClient(),
  ],
});

export const {
  useSession,
  signIn,
  signOut,
  passkey,
  twoFactor,
  useListPasskeys,
} = authClient;
