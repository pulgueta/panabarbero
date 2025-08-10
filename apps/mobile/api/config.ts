import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export const api = hc<AppBackend>(API_URL);
