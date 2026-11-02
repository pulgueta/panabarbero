import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexAction, useConvexAction } from "@convex-dev/react-query";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

/**
 * Team invitations live in WorkOS, so the list is backed by a Convex **action**
 * (non-reactive, one-shot) rather than a live query. Send/revoke/resend
 * invalidate it to refetch.
 */
export function invitationsListQueryOptions(barbershopId: Barbershop["_id"]) {
  return convexAction(api.invitations.listInvitations, { barbershopId });
}

export function useInvitations(barbershopId: Barbershop["_id"]) {
  return useQuery(invitationsListQueryOptions(barbershopId));
}

export function useInvitationActions(barbershopId: Barbershop["_id"]) {
  const queryClient = useQueryClient();

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: invitationsListQueryOptions(barbershopId).queryKey,
    });

  const inviteMutation = useMutation({
    mutationFn: useConvexAction(api.invitations.invite),
    onSuccess: invalidate,
  });

  const revokeMutation = useMutation({
    mutationFn: useConvexAction(api.invitations.revokeInvitation),
    onSuccess: invalidate,
  });

  const resendMutation = useMutation({
    mutationFn: useConvexAction(api.invitations.resendInvitation),
    onSuccess: invalidate,
  });

  return { inviteMutation, revokeMutation, resendMutation };
}
