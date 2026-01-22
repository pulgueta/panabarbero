import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { passkeyClient } from "better-auth/client/plugins";
import { twoFactorClient } from "better-auth/plugins";
// import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { env } from "../../../web/src/env";

export const authClient = createAuthClient({
  baseURL: env.VITE_CONVEX_SITE_URL,
  plugins: [convexClient(), passkeyClient(), twoFactorClient()],
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
