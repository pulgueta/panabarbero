import type { FiltersSchema } from "@panabarbero/api/schemas";
import { QUERY_KEYS } from "@panabarbero/constants/tanstack";
import type { CreateBarbershop } from "@panabarbero/db/schema/zod";
import {
  useMutation,
  useQuery,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";

import { api } from "../../index";

interface UseBarbershopProps {
  filters: FiltersSchema;
  uuid: string;
}

export function useBarbershop(opts?: UseBarbershopProps) {
  const queryClient = useQueryClient();

  const getBarbershops = useSuspenseQuery({
    queryKey: QUERY_KEYS.BARBERSHOP,
    queryFn: async () => {
      const res = await api.barbershops.$get({
        query: opts?.filters ?? {},
      });

      return res.json();
    },
  });

  const getBarbershopByUuid = useQuery({
    queryKey: QUERY_KEYS.BARBERSHOP_BY_UUID(opts?.uuid ?? ""),
    queryFn: async () => {
      const res = await api.barbershop.$get({
        param: {
          uuid: opts?.uuid ?? "",
        },
      });

      return res.json();
    },
    enabled: !!opts?.uuid,
  });

  const createBarbershop = useMutation({
    mutationKey: [QUERY_KEYS.BARBERSHOP],
    mutationFn: async (data: CreateBarbershop) => {
      const res = await api.barbershops.$post({
        json: data,
      });

      return res.json();
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.BARBERSHOP,
      });

      if ("uuid" in created) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.BARBERSHOP_BY_UUID(created.uuid),
        });
        queryClient.prefetchQuery({
          queryKey: QUERY_KEYS.BARBERSHOP_BY_UUID(created.uuid),
          queryFn: async () => {
            const res = await api.barbershop.$get({
              param: {
                uuid: created.uuid,
              },
            });

            return res.json();
          },
        });
      }
    },
  });

  return {
    getBarbershops,
    getBarbershopByUuid,
    createBarbershop,
  };
}
