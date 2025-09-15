import { authServerEnv } from "@panabarbero/auth/env-server";
import { databaseServerEnv } from "@panabarbero/db/env";
import { createEnv } from "@t3-oss/env-core";
import { string, url } from "zod";

export const env = createEnv({
  server: {
    API_USERNAME: string().min(1),
    API_PASSWORD: string().min(1),
    REDIS_URL: url().startsWith("redis://"),
    APP_URL: url(),
  },
  extends: [authServerEnv, databaseServerEnv],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
