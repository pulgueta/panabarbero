import { api } from "@panabarbero/convex/api";
import { useMutation, useQuery } from "convex/react";

export function useBarbershops() {
  const createBarbershop = useMutation(api.barbershops.createBarbershop);
  const getBarbershops = useQuery(api.barbershops.getBarbershops);

  return {
    createBarbershop,
    getBarbershops,
  };
}
