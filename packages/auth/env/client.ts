import { createEnv } from "@t3-oss/env-core";
import { url } from "zod/v4";

export const clientEnv = createEnv({
  client: {
    VITE_API_URL: url(),
  },
  clientPrefix: "VITE_",
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
