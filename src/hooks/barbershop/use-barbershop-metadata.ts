import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import { useMutation } from "@tanstack/react-query";

export function barbershopMetadataQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMetadata.get, {
    id: barbershopId,
  });
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
