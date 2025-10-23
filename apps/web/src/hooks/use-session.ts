import { useSession as useSessionHook } from "@panabarbero/convex/auth";

export function useSession() {
  return useSessionHook();
}
