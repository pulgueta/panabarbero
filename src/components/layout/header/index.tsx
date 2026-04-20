import { Link, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/config";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { useLocationStore } from "@/store/barbershop-filters";

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
  const persistedState = useLocationStore((s) => s.state);
  const persistedCity = useLocationStore((s) => s.city);

  const router = useRouterState();
  const currentPath = router.location.pathname;

  const today = Date.now();
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setHours(23, 59, 59, 999);

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
          <div className="flex items-center font-medium text-sm md:space-x-4 lg:space-x-8">
            {routes.map((route) => (
              <Button
                key={route.to}
                variant={currentPath === route.to ? "outline" : "ghost"}
                nativeButton={false}
                render={
                  <Link
                    to={route.to}
                    style={{ viewTransitionName: route.to }}
                    search={
                      route.to === "/profile"
                        ? { tab: "account" }
                        : route.to === "/profile/barbershops/appointments"
                          ? { date: startOfDay.getTime() }
                          : route.to === "/barbershops"
                            ? { city: persistedCity, state: persistedState }
                            : undefined
                    }
                  />
                }
              >
                {route.label}
              </Button>
            ))}
          </div>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
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
