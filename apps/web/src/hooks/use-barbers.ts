import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { useQuery } from "@tanstack/react-query";

export function barbersByBarbershopIdQueryOptions(
  barbershopId: Barbershop["_id"],
) {
  return convexQuery(api.barbers.getBarbersByBarbershopId, { barbershopId });
}

export function useBarbersByBarbershopId(barbershopId: Barbershop["_id"]) {
  return useQuery(barbersByBarbershopIdQueryOptions(barbershopId));
}
