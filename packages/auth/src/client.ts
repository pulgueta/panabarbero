import {
  inferAdditionalFields,
  lastLoginMethodClient,
  organizationClient,
  passkeyClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { authClientEnv } from "../env/client";
import type { auth } from "./index";

export const {
  useSession,
  signIn,
  signOut,
  useListPasskeys,
  useActiveMember,
  useActiveOrganization,
  useListOrganizations,
  organization,
  passkey,
  twoFactor,
  getSession,
  isLastUsedLoginMethod,
  getLastUsedLoginMethod,
} = createAuthClient({
  baseURL: authClientEnv.NEXT_PUBLIC_API_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    organizationClient(),
    passkeyClient(),
    twoFactorClient(),
    lastLoginMethodClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
