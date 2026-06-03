import { Link } from "@tanstack/react-router";
import { domMax, LazyMotion } from "motion/react";
import { useWebHaptics } from "web-haptics/react";

import { useNavRoutes } from "@/hooks/use-nav-routes";
import { cn } from "@/lib/utils";
import { useNavSearch } from "./nav-data";
import { NavIndicator } from "./nav-indicator";
import { useActiveRoute } from "./use-active-route";

/**
 * Mobile bottom tab bar — the primary navigation surface on phones
 * ("mobile is the home"). Bottom-reachable targets, an animated active
 * indicator, and safe-area padding for gesture devices.
 */
export function BottomNav() {
  const { routes } = useNavRoutes();
  const activeTo = useActiveRoute(routes);
  const navSearch = useNavSearch();
  const { trigger } = useWebHaptics();

  return (
    <LazyMotion features={domMax}>
      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-50 border-border border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden dark:bg-card"
      >
        <ul
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${routes.length}, minmax(0, 1fr))`,
          }}
        >
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = activeTo === route.to;

            return (
              <li className="relative" key={route.to}>
                <Link
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-center font-medium text-xs transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => trigger()}
                  search={navSearch(route.to)}
                  style={{ viewTransitionName: route.to }}
                  to={route.to}
                >
                  {isActive && (
                    <NavIndicator
                      layoutId="bottom-nav-indicator"
                      variant="pill"
                    />
                  )}
                  <Icon
                    className="size-4"
                    weight={isActive ? "fill" : "regular"}
                  />
                  <span className="leading-none">{route.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </LazyMotion>
  );
}
