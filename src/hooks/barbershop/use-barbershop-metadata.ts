import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import type { Barbershop } from "@convex/schema";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function barbershopMetadataQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMetadata.get, {
    id: barbershopId,
  });
}

export function useBarbershopMetadata(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopMetadataQueryOptions(barbershopId));
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
