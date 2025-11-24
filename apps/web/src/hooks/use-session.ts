import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useQuery } from "@tanstack/react-query";

export function getSessionQueryOptions() {
  return convexQuery(api.auth.getCurrentUser, {});
}

export function useSession() {
  return useQuery(getSessionQueryOptions());
}
