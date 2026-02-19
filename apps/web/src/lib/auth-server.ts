import { convexBetterAuthReactStart } from "@convex-dev/better-auth/react-start";

import { env } from "@/env";

export const {
  handler,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthReactStart({
  convexUrl: env.PUBLIC_CONVEX_URL,
  convexSiteUrl: env.PUBLIC_CONVEX_SITE_URL,
});
