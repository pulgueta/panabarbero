import { api } from "@panabarbero/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

export type Access = FunctionReturnType<typeof api.mobileAccess.getAccess>;

/** Gate data for the barbershop app. `undefined` while loading. */
export function useAccess() {
  return useQuery(api.mobileAccess.getAccess);
}
