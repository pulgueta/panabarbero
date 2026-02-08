import { passkeyClient } from "@better-auth/passkey/client";
import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth";
import {
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { createAuthMutations } from "better-convex/react";

import { env } from "@/env";

export const authClient = createAuthClient({
  baseURL: env.PUBLIC_CONVEX_SITE_URL,
  plugins: [
    convexClient(),
    passkeyClient(),
    twoFactorClient(),
    crossDomainClient(),
    organizationClient(),
    polarClient(),
  ],
});

export const {
  useSignOutMutationOptions,
  useSignInSocialMutationOptions,
  useSignInMutationOptions,
  useSignUpMutationOptions,
} = createAuthMutations(authClient);

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
  // Organization exports
  organization,
  useActiveOrganization,
  useListOrganizations,
  // Polar exports
  checkout,
  customer,
} = authClient;
