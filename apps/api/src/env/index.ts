import { createEnv } from "@t3-oss/env-core";
import { string, url } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: url().startsWith("postgresql://"),
    APP_URL: url(),
    API_USERNAME: string().min(1),
    API_PASSWORD: string().min(1),
    API_URL: url(),
    REDIS_URL: url().startsWith("redis://"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
