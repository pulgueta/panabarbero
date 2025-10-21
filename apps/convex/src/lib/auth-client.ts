import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { passkeyClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_CONVEX_SITE_URL,
  plugins: [convexClient(), passkeyClient(), twoFactorClient()],
});

export const { useSession, signIn, signOut, passkey, twoFactor } = authClient;
