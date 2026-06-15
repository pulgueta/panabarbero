import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const serverEnv = createEnv({
  server: {
    WORKOS_CLIENT_ID: z.string(),
    WORKOS_API_KEY: z.string(),
    WORKOS_REDIRECT_URI: z.url(),
    WORKOS_COOKIE_PASSWORD: z.string().min(32),
  },
  runtimeEnv: process.env,
});
