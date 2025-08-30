import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

function getApiUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (process.env.VITE_API_URL) {
    return process.env.VITE_API_URL;
  }

  return "http://localhost:3000";
}

export const api = hc<AppBackend>(getApiUrl(), {
  init: {
    credentials: "include",
  },
});
