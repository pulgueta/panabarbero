import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useQuery } from "@tanstack/react-query";

export function useSession() {
  return useQuery(convexQuery(api.auth.getCurrentUser, {}));
}
