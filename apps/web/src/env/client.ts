import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const clientEnv = createEnv({
  clientPrefix: "VITE_",
  client: {
    VITE_CONVEX_URL: z.url(),
    VITE_CONVEX_SITE_URL: z.url(),
    VITE_STORAGE_URL: z.url(),
    VITE_POSTHOG_API_KEY: z.string(),
  },
  runtimeEnv: import.meta.env,
});
