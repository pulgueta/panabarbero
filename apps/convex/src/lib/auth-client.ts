import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_CONVEX_SITE_URL,
  plugins: [convexClient(), crossDomainClient(), passkeyClient()],
});

export const { useSession, signIn, signOut, passkey } = authClient;
