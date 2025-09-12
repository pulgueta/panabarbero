import { authClientEnv } from "@panabarbero/auth/env-client";
import { createEnv } from "@t3-oss/env-core";

export const clientEnv = createEnv({
  client: {},
  extends: [authClientEnv],
  clientPrefix: "NEXT_PUBLIC_",
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
