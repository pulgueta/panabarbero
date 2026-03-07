import { convexQuery } from "@convex-dev/react-query";
import type { Barbershop } from "@convex/schema";
import { useSuspenseQuery } from "@tanstack/react-query";
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
