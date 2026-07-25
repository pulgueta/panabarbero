import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";

import type { BarbershopSort } from "@/routes/barbershops";

export type ActiveBarbershopsPayload = {
  city?: string | undefined;
  state?: string | undefined;
  userId?: string | undefined;
  minRating?: number | undefined;
  minReviews?: number | undefined;
  sortBy?: BarbershopSort | undefined;
};

export function activeBarbershopsQueryOptions(
  payload: ActiveBarbershopsPayload,
) {
  return convexQuery(api.barbershops.getActive, payload);
}

export function barbershopByUuidQueryOptions(uuid: string) {
  return convexQuery(api.barbershops.getByUuid, { uuid });
}

function barbershopsByIdsQueryOptions(barbershopIds: Barbershop["_id"][]) {
  return convexQuery(api.barbershops.getByIds, {
    barbershopIds: barbershopIds.map((id) => ({ id })),
  });
}

export function barbershopAvailabilityQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershops.getAvailability, {
    id: barbershopId,
  });
}

export function barbershopByOwnerIdQueryOptions(ownerId: string) {
  return convexQuery(api.barbershops.getByOwnerId, { ownerId });
}

export function barbershopByMemberUserIdQueryOptions(userId: string) {
  return convexQuery(api.barbershops.getByMemberUserId, { userId });
}

export function useBarbershopByUuid(uuid: string) {
  return useSuspenseQuery(barbershopByUuidQueryOptions(uuid));
}

export function useActiveBarbershops(payload: ActiveBarbershopsPayload) {
  return useSuspenseQuery(activeBarbershopsQueryOptions(payload));
}

export function useBarbershopsByIds(barbershopIds: Barbershop["_id"][]) {
  return useSuspenseQuery(barbershopsByIdsQueryOptions(barbershopIds));
}

export function useBarbershopByOwnerId(ownerId: string) {
  return useSuspenseQuery(barbershopByOwnerIdQueryOptions(ownerId));
}

export function useBarbershopByMemberUserId(userId: string) {
  return useQuery(barbershopByMemberUserIdQueryOptions(userId));
}

export function useBarbershopAvailability(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopAvailabilityQueryOptions(barbershopId));
}

export function useBarbershopActions() {
  const createBarbershopMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.create),
  });
  const updateBarbershopMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.update),
  });
  const updateBarbershopDayAvailabilityMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.updateDayAvailability),
  });
  const updateBarbershopAvailabilityMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.updateAvailability),
  });
  const deleteBarbershopMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.deleteCascade),
  });

  return {
    createBarbershopMutation,
    updateBarbershopMutation,
    updateBarbershopDayAvailabilityMutation,
    updateBarbershopAvailabilityMutation,
    deleteBarbershopMutation,
  };
}
