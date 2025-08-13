import { createEnv } from "@t3-oss/env-core";
import { url } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: url(),
    APP_URL: url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
