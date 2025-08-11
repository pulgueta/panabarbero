/** biome-ignore-all lint/style/noNonNullAssertion: Required for env variables */
import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

function getApiUrl(env?: "mobile" | "web") {
  if (env === "mobile") {
    return process.env.EXPO_PUBLIC_API_URL!;
  }

  return process.env.VITE_API_URL!;
}

export const api = hc<AppBackend>(getApiUrl());
