import { createEnv } from "@t3-oss/env-core";
import { string, url } from "zod";

export const authServerEnv = createEnv({
  server: {
    BETTER_AUTH_SECRET: string().min(1),
    BETTER_AUTH_URL: url(),
    GOOGLE_CLIENT_ID: string().min(1),
    GOOGLE_CLIENT_SECRET: string().min(1),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
