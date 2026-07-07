import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useMutation, useQuery } from "@tanstack/react-query";

export function barbershopMetadataQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMetadata.get, {
    id: barbershopId,
  });
}

export function useBarbershopMetadata(barbershopId: Barbershop["_id"]) {
  return useQuery(barbershopMetadataQueryOptions(barbershopId));
}

export function barbershopLocationQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMetadata.getLocation, {
    id: barbershopId,
  });
}

export function useBarbershopLocation(barbershopId: Barbershop["_id"]) {
  return useQuery(barbershopLocationQueryOptions(barbershopId));
}

export function useBarbershopLocationActions() {
  const setLocationMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMetadata.setLocation),
  });
  const removeLocationMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMetadata.removeLocation),
  });

  return { setLocationMutation, removeLocationMutation } as const;
}

export function useBarbershopMetadataActions() {
  const setLogoKeyMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.setLogoKey),
  });
  const removeLogoKeyMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershops.removeLogoKey),
  });

  return {
    setLogoKeyMutation,
    removeLogoKeyMutation,
  } as const;
}

export function useSocialMediaActions() {
  const upsertSocialLinkMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMetadata.upsertSocialLink),
  });
  const removeSocialLinkMutation = useMutation({
    mutationFn: useConvexMutation(api.barbershopMetadata.removeSocialLink),
  });

  return { upsertSocialLinkMutation, removeSocialLinkMutation } as const;
}
