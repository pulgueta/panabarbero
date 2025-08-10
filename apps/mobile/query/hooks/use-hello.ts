import { QUERY_KEYS } from "@panabarbero/constants";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useHello() {
  return useQuery({
    queryKey: QUERY_KEYS.HELLO,
    queryFn: async () => {
      const req = await api.index.$get();

      const res = await req.json();

      return res.message;
    },
  });
}
