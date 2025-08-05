import { createEnv } from "@t3-oss/env-core";
import { string, enum as zodEnum } from "zod/v4";

export const serverEnv = createEnv({
  server: {
    AUTH_DISCORD_ID: string().min(1),
    AUTH_DISCORD_SECRET: string().min(1),
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? string().min(1)
        : string().min(1).optional(),
    NODE_ENV: zodEnum(["development", "production"])
      .optional()
      .default("development"),
  },
  runtimeEnv: process.env,
  skipValidation:
    !!process.env.CI || process.env.npm_lifecycle_event === "lint",
});
