import { convexQuery } from "@convex-dev/react-query";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function getSessionQueryOptions() {
  return convexQuery(api.auth.getAuthUser, {});
}

export function useSession() {
  return useSuspenseQuery(getSessionQueryOptions());
}
