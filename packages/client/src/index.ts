import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

function getApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }

  throw new Error("No API URL found");
}

export const api = hc<AppBackend>(getApiUrl(), {
  init: {
    credentials: "include",
  },
});
