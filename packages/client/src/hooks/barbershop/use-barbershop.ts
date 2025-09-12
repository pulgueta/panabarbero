import { QUERY_KEYS } from "@panabarbero/constants/tanstack";
import type { CreateBarbershop } from "@panabarbero/db/schema/zod";
import { useMutation, useQueries } from "@tanstack/react-query";

import { api } from "@/src";

interface UseBarbershopProps {
  uuid?: string;
}

export function useBarbershop(opts?: UseBarbershopProps) {
  const barbershopQueries = useQueries({
    queries: [
      {
        queryKey: QUERY_KEYS.BARBERSHOP,
        queryFn: async () => {
          const res = await api.barbershop.$get();

          return res.json();
        },
      },
      {
        queryKey: QUERY_KEYS.BARBERSHOP_BY_UUID(opts?.uuid ?? ""),
        enabled: !!opts?.uuid,
        queryFn: async () => {
          const res = await api.barbershop.$get({
            query: {
              uuid: opts?.uuid ?? "",
            },
          });

          return res.json();
        },
      },
    ],
  });

  const createBarbershop = useMutation({
    mutationKey: [QUERY_KEYS.BARBERSHOP],
    mutationFn: async (data: CreateBarbershop) => {
      const res = await api.barbershop.$post({
        json: data,
      });

      return res.json();
    },
  });

  return {
    barbershopQueries,
    createBarbershop,
  };
}
