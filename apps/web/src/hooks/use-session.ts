import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function getSessionQueryOptions() {
  return convexQuery(api.auth.getCurrentUser, {});
}

export function useSession() {
  return useQuery(getSessionQueryOptions());
}
