import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "PUBLIC_",
  client: {
    PUBLIC_CONVEX_URL: z.url(),
    PUBLIC_CONVEX_SITE_URL: z.url(),
  },
  runtimeEnvStrict: {
    PUBLIC_CONVEX_URL: import.meta.env.PUBLIC_CONVEX_URL,
    PUBLIC_CONVEX_SITE_URL: import.meta.env.PUBLIC_CONVEX_SITE_URL,
  },
});
