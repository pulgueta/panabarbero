import { QUERY_KEYS } from "@panabarbero/constants";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/api/config";

export function useHello() {
  return useQuery({
    queryKey: QUERY_KEYS.HELLO,
    queryFn: async () => {
      const res = await api.index.$get();

      return res.json();
    },
  });
}
