import { tanstack } from "@panabarbero/constants";
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";
import { ThemeToggler } from "../theme-toggler";
import { UserPopover } from "./user-popover";

export const Header = () => {
  const { data: user, isLoading } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");

  const router = useRouterState();

  const currentPath = router.location.pathname;

  const navigationRoutesWithoutSettings = user
    ? tanstack.authenticatedRoutes.navigation.filter(
        (route) => route.to !== "/settings",
      )
    : tanstack.publicRoutes.navigation.filter(
        (route) => route.to !== "/settings",
      );

  const defaultProfileTab = isBarber ? "account" : "appointments";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4">
      <div className="container mx-auto flex h-16 items-center border-x md:px-8 lg:px-10">
        <div className="mr-6 flex">
          <Link
            to="/profile"
            search={{ tab: defaultProfileTab }}
            className="font-bold text-2xl tracking-tighter lg:text-3xl"
          >
            PanaBarbero
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center">
          <div className="flex items-center font-medium text-sm md:space-x-8 lg:space-x-16">
            {isBarber
              ? tanstack.authenticatedRoutes.barber.map((route) => (
                  <Button
                    key={route.to}
                    variant={currentPath === route.to ? "outline" : "ghost"}
                    asChild
                  >
                    <Link
                      key={route.to}
                      to={route.to}
                      style={{
                        viewTransitionName: route.to,
                      }}
                      search={
                        route.to === "/profile"
                          ? { tab: defaultProfileTab }
                          : undefined
                      }
                    >
                      {route.label}
                    </Link>
                  </Button>
                ))
              : navigationRoutesWithoutSettings.map((route) => (
                  <Button
                    key={route.to}
                    variant={currentPath === route.to ? "outline" : "ghost"}
                    asChild
                  >
                    <Link
                      key={route.to}
                      to={route.to}
                      style={{
                        viewTransitionName: route.to,
                      }}
                      search={
                        route.to === "/profile"
                          ? { tab: defaultProfileTab }
                          : undefined
                      }
                    >
                      {route.label}
                    </Link>
                  </Button>
                ))}
          </div>
        </nav>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {isLoading ? (
              <Skeleton className="h-9 w-28" />
            ) : user ? (
              <UserPopover {...user} />
            ) : (
              <Button asChild>
                <Link to="/login">Iniciar sesión</Link>
              </Button>
            )}

            <ThemeToggler />
          </div>
        </div>
      </div>
    </header>
  );
};
