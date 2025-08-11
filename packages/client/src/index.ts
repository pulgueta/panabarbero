/** biome-ignore-all lint/style/noNonNullAssertion: Required for env variables */
import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

type Env = "mobile" | "web";

function getApiUrl(env?: Env) {
  if (env === "mobile") {
    return process.env.EXPO_PUBLIC_API_URL!;
  }

  return process.env.VITE_API_URL!;
}

export function createApiClient(env?: Env) {
  return hc<AppBackend>(getApiUrl(env));
}
