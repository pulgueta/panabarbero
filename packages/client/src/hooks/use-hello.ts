import { tanstack } from "@panabarbero/constants";
import { useQuery } from "@tanstack/react-query";

import { api } from "../index";

export function useHello() {
  return useQuery({
    queryKey: tanstack.QUERY_KEYS.HELLO,
    queryFn: async () => {
      const res = await api.index.$get();

      return res.json();
    },
  });
}
