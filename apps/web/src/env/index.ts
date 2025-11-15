import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_CONVEX_URL: z.url(),
    PUBLIC_CONVEX_SITE_URL: z.url(),
    PUBLIC_POSTHOG_API_KEY: z.string(),
    PUBLIC_POSTHOG_HOST: z.string(),
  },
  runtimeEnvStrict: {
    PUBLIC_CONVEX_URL: import.meta.env.PUBLIC_CONVEX_URL,
    PUBLIC_CONVEX_SITE_URL: import.meta.env.PUBLIC_CONVEX_SITE_URL,
    PUBLIC_POSTHOG_API_KEY: import.meta.env.PUBLIC_POSTHOG_API_KEY,
    PUBLIC_POSTHOG_HOST: import.meta.env.PUBLIC_POSTHOG_HOST,
  },
});
