import { passkeyClient } from "@better-auth/passkey/client";
import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { twoFactorClient } from "better-auth/plugins";
// import { twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
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
