import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useSuspenseQuery } from "@tanstack/react-query";

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
