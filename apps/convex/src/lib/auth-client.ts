import {
  convexClient,
  crossDomainClient,
} from "@convex-dev/better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

interface AuthClientProps {
  baseURL: string;
}

export const authClient = (opts?: AuthClientProps) =>
  createAuthClient({
    baseURL: opts?.baseURL,
    plugins: [convexClient(), crossDomainClient()],
  });
