import { organizationClient, passkeyClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { clientEnv } from "@/env/client";

export const {
  useSession,
  signIn,
  signOut,
  useListPasskeys,
  useActiveMember,
  useActiveOrganization,
  useListOrganizations,
  passkey,
} = createAuthClient({
  baseURL: clientEnv.VITE_API_URL,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [organizationClient(), passkeyClient()],
});
