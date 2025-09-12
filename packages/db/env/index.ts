import { createEnv } from "@t3-oss/env-core";
import { url } from "zod";

export const databaseServerEnv = createEnv({
  server: {
    DATABASE_URL: url().startsWith("postgresql://"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
