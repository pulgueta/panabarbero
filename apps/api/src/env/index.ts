import { createEnv } from "@t3-oss/env-core";
import { string, url } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: url().startsWith("postgres://"),
    APP_URL: url(),
    API_USERNAME: string().min(1),
    API_PASSWORD: string().min(1),
    API_URL: url(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
