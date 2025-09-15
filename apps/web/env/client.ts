import { authClientEnv } from "@panabarbero/auth/env-client";
import { createEnv } from "@t3-oss/env-nextjs";
import { string } from "zod";

export const clientEnv = createEnv({
  client: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: string(),
  },
  extends: [authClientEnv],
  runtimeEnv: {
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY:
      process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
