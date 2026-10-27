import { api } from "@panabarbero/backend/convex/_generated/api";
import { useConvexAuth, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";

export type Access = FunctionReturnType<typeof api.mobileAccess.getAccess>;

/**
 * Gate data for the barbershop app. `undefined` while loading, and while
 * Convex has no authenticated session (the query requires one).
 */
export function useAccess() {
  const { isAuthenticated } = useConvexAuth();
  return useQuery(api.mobileAccess.getAccess, isAuthenticated ? {} : "skip");
}
