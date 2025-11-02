import { tanstack } from "@panabarbero/constants";
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { ThemeToggler } from "../theme-toggler";
import { UserPopover } from "./user-popover";

export const Header = () => {
  const { data: user, isLoading } = useSession();

  const router = useRouterState();

  const currentPath = router.location.pathname;

  const navigationRoutesWithoutSettings = tanstack
    .getNavigationRoutes(user?._id)
    .filter((route) => route.to !== "/settings");

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-4">
      <div className="container mx-auto flex h-16 items-center border-x md:px-8 lg:px-16">
        <div className="mr-6 flex">
          <Link
            to="/profile"
            className="font-bold text-2xl tracking-tighter lg:text-3xl"
          >
            PanaBarbero
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center">
          <div className="flex items-center font-medium text-sm md:space-x-8 lg:space-x-16">
            {navigationRoutesWithoutSettings.map((route) => (
              <Button
                key={route.to}
                variant={currentPath === route.to ? "default" : "ghost"}
                asChild
              >
                <Link
                  key={route.to}
                  to={route.to}
                  style={{
                    viewTransitionName: route.to,
                  }}
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
