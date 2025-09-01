import { serverEnv } from "@panabarbero/auth/env-server";
import { databaseServerEnv } from "@panabarbero/db/env";
import { createEnv } from "@t3-oss/env-core";
import { url } from "zod";

export const env = createEnv({
  server: {
    REDIS_URL: url().startsWith("redis://"),
  },
  extends: [serverEnv, databaseServerEnv],
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
