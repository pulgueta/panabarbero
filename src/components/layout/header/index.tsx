import { Link, useRouterState } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { useSession } from "@/hooks/use-session";

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

export const Header = () => {
  const { data: user, isLoading } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const { routes } = useNavRoutes();

  const router = useRouterState();
  const currentPath = router.location.pathname;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:px-4">
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
            PanaBarbero
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
                      route.to === "/profile" ? { tab: "account" } : undefined
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
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              !user && (
                <Button nativeButton={false} render={<Link to="/login" />}>
                  Iniciar sesión
                </Button>
              )
            )}

            <Suspense fallback={<Skeleton className="size-8" />}>
              {user?.userId && (
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
