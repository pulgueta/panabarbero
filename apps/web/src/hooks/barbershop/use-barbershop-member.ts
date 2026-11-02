import { api } from "@convex/_generated/api";
import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";

export function barbershopMemberRolesQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.getRolesByUserId, { userId });
}

export function useBarbershopMemberRoles(userId: string) {
  return useQuery(barbershopMemberRolesQueryOptions(userId));
}
