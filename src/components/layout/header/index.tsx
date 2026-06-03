import { Link } from "@tanstack/react-router";
import { domMax, LazyMotion } from "motion/react";
import { lazy, Suspense } from "react";
import { useNavSearch } from "@/components/layout/nav/nav-data";
import { NavIndicator } from "@/components/layout/nav/nav-indicator";
import { useActiveRoute } from "@/components/layout/nav/use-active-route";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/config";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { cn } from "@/lib/utils";

const ThemeToggler = lazy(() =>
  import("@/components/layout/theme-toggler").then((mod) => ({
    default: mod.ThemeToggler,
  })),
);
const UserAvatar = lazy(() =>
  import("@/components/layout/user-avatar").then((mod) => ({
    default: mod.UserAvatar,
  })),
);
const NotificationsBell = lazy(() =>
  import("@/components/notifications/notifications-bell").then((mod) => ({
    default: mod.NotificationsBell,
  })),
);

export const Header = () => {
  const { routes, user } = useNavRoutes();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const activeTo = useActiveRoute(routes);
  const navSearch = useNavSearch();

  return (
    <header className="sticky top-0 z-50 hidden w-full border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:block md:px-4">
      <div className="container mx-auto flex h-16 items-center border-x md:px-8 lg:px-10">
        <div className="mr-6 flex">
          <Link
            to={
              user
                ? isBarber
                  ? "/profile/barbershops/appointments"
                  : "/profile"
                : "/"
            }
            search={user ? { tab: "account" } : undefined}
            className="font-bold text-2xl tracking-tighter lg:text-3xl"
          >
            {APP_NAME}
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center">
          <LazyMotion features={domMax}>
            <ul className="flex items-center font-medium text-sm">
              {routes.map((route) => {
                const isActive = activeTo === route.to;

                return (
                  <li className="relative" key={route.to}>
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "relative flex h-16 items-center px-3 transition-colors lg:px-4",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      search={navSearch(route.to)}
                      style={{ viewTransitionName: route.to }}
                      to={route.to}
                    >
                      {route.label}
                      {isActive && (
                        <NavIndicator
                          layoutId="desktop-nav-indicator"
                          variant="underline"
                        />
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </LazyMotion>
        </nav>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {user?.userId ? (
              <Suspense fallback={<Skeleton className="size-9" />}>
                <NotificationsBell />
              </Suspense>
            ) : null}
            <Suspense fallback={<Skeleton className="size-8" />}>
              {user?.userId ? (
                <div className="hidden md:block">
                  <UserAvatar
                    user={{
                      userId: user.userId,
                      email: user.email,
                      name: user.name,
                      image: user.image,
                    }}
                  />
                </div>
              ) : (
                <Button nativeButton={false} render={<Link to="/login" />}>
                  Iniciar sesión
                </Button>
              )}
            </Suspense>
            <Suspense fallback={<Skeleton className="size-8" />}>
              <ThemeToggler />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
};
