import { createEnv } from "@t3-oss/env-core";
import { vercel } from "@t3-oss/env-core/presets-zod";
import { url } from "zod";

export const authClientEnv = createEnv({
  client: {
    NEXT_PUBLIC_API_URL: url(),
  },
  clientPrefix: "NEXT_PUBLIC_",
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
  extends: [vercel()],
});
