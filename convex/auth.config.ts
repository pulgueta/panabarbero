import type { AuthFunctions } from "@convex-dev/workos-authkit";
import { AuthKit } from "@convex-dev/workos-authkit";
import type { AuthConfig } from "convex/server";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";

const authFunctions: AuthFunctions = internal.auth;

export const authkit = new AuthKit<DataModel>(components.workOSAuthKit, {
  authFunctions,
  actionSecret: "",
});

export default {
  providers: authkit.getAuthConfigProviders(),
} satisfies AuthConfig;
