import { authenticatedRoutes, publicRoutes } from "@/config";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import { useIsBarber, useIsStaff } from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";

/**
 * Centralized navigation route resolver.
 * Returns the correct set of routes based on auth state and user role.
 *
 * Route resolution:
 *   - Owner (barber or not)  → owner routes (full dashboard)
 *   - Staff (receptionist)   → staff routes (appointments + team + services + profile)
 *   - Barber (non-owner)     → barber routes (appointments + profile)
 *   - Customer               → authenticated navigation (no dashboard)
 *   - Unauthenticated        → public routes
 */
export function useNavRoutes() {
  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.id ?? "");
  const { data: isStaff } = useIsStaff(user?.id ?? "");
  const { data: rolesData } = useBarbershopMemberRoles(user?.id ?? "");

  const isOwner = rolesData?.isOwner ?? false;
  const isMember = isOwner || isStaff || isBarber;

  const routes = user
    ? isMember
      ? authenticatedRoutes.member
      : authenticatedRoutes.navigation.filter((r) => r.to !== "/")
    : publicRoutes.navigation;

  return { routes, user, isBarber, isStaff, isOwner };
}
