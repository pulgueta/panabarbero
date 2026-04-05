import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useSuspenseQuery } from "@tanstack/react-query";

export function getSessionQueryOptions() {
  return convexQuery(api.auth.getCurrentUser);
}

export function useSession() {
  return useSuspenseQuery(getSessionQueryOptions());
}
