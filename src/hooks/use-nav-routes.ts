import { authenticatedRoutes, publicRoutes } from "@/config";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";

/**
 * Centralized navigation route resolver.
 * Returns the correct set of routes based on auth state and user role,
 * eliminating the duplicated triple-conditional logic from Header and BottomBar.
 */
export function useNavRoutes() {
  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId ?? "");

  const isOwner = rolesData?.isOwner ?? false;

  const routes = user
    ? isBarber
      ? isOwner
        ? authenticatedRoutes.owner
        : authenticatedRoutes.barber
      : authenticatedRoutes.navigation.filter((r) => r.to !== "/")
    : publicRoutes.navigation;

  return { routes, user, isBarber: isBarber ?? false, isOwner };
}
