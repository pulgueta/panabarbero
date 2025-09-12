import {
  inferAdditionalFields,
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
} = createAuthClient({
  baseURL: authClientEnv.NEXT_PUBLIC_API_URL,
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
