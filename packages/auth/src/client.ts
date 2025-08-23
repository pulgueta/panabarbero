import {
  inferAdditionalFields,
  organizationClient,
  passkeyClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { clientEnv } from "@/env/client";
import type { auth } from ".";

export const {
  useSession,
  signIn,
  signOut,
  useListPasskeys,
  useActiveMember,
  useActiveOrganization,
  useListOrganizations,
  passkey,
  twoFactor,
  getSession,
} = createAuthClient({
  baseURL: clientEnv.VITE_API_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    organizationClient(),
    passkeyClient(),
    twoFactorClient(),
    inferAdditionalFields<typeof auth>(),
  ],
});
