import { convexQuery } from "@convex-dev/react-query";
import { useQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function barbershopMemberRolesQueryOptions(userId: string) {
  return convexQuery(api.barbershopMembers.getRolesByUserId, {
    userId,
  });
}

export function useBarbershopMemberRoles(userId: string) {
  return useQuery(barbershopMemberRolesQueryOptions(userId));
}
