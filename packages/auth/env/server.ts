import { createEnv } from "@t3-oss/env-core";
import { string } from "zod/v4";

export const serverEnv = createEnv({
  server: {
    AUTH_SECRET: string().min(1),
    GOOGLE_CLIENT_ID: string().min(1),
    GOOGLE_CLIENT_SECRET: string().min(1),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
