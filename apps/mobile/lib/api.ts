import type { AppBackend } from "@panabarbero/api";
import { hc } from "hono/client";

export const api = hc<AppBackend>("http://localhost:3000");
