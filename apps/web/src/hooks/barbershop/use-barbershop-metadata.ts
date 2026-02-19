import { convexQuery } from "@convex-dev/react-query";
import type { Barbershop } from "@convex/tables";
import { useSuspenseQuery } from "@tanstack/react-query";
import { api } from "convex/_generated/api";

export function barbershopMetadataQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbershopMetadata.get, {
    barbershopId,
  });
}

export function useBarbershopMetadata(barbershopId: Barbershop["_id"]) {
  return useSuspenseQuery(barbershopMetadataQueryOptions(barbershopId));
}
