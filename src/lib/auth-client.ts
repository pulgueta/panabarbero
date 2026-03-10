import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});

export const {
  useSession,
  changeEmail,
  changePassword,
  requestPasswordReset,
  resetPassword,
  verifyEmail,
  linkSocial,
  unlinkAccount,
  listAccounts,
  signIn,
  signOut,
  signUp,
} = authClient;
