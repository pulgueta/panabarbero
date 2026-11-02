import { useRouterState } from "@tanstack/react-router";
import { useMemo } from "react";

interface NavRouteLike {
  to: string;
}

/** `/` matches exactly; every other route matches itself or any descendant. */
function isActivePath(pathname: string, to: string): boolean {
  if (to === "/") return pathname === "/";
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * Returns the `to` of the single active nav item using longest-prefix-wins so
 * nested routes don't light up their parent too (e.g. `/profile` stays quiet on
 * `/profile/barbershops/appointments`, which keeps exactly one item active).
 */
export function useActiveRoute(routes: NavRouteLike[]): string | undefined {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return useMemo(() => {
    const active = routes.filter((route) => isActivePath(pathname, route.to));
    return active.sort((a, b) => b.to.length - a.to.length)[0]?.to;
  }, [routes, pathname]);
}
