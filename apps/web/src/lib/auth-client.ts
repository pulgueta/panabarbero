import { passkeyClient } from "@better-auth/passkey/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { twoFactorClient } from "better-auth/plugins";
// import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "@/env";

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
  changeEmail,
  changePassword,
  passkey,
  useListPasskeys,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  linkSocial,
  unlinkAccount,
  listAccounts,
  twoFactor,
  signIn,
  signOut,
  signUp,
} = authClient;
