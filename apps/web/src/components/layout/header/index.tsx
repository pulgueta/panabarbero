import { ClientOnly, Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authenticatedRoutes, publicRoutes } from "@/config";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";
import { ThemeToggler } from "../theme-toggler";
import { UserAvatar } from "../user-avatar";

export const Header = () => {
  const { data: user, isLoading } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId ?? "");

  const router = useRouterState();

  const currentPath = router.location.pathname;

  const defaultProfileTab = isBarber ? "account" : "appointments";

  const navigationRoutes = rolesData?.isOwner
    ? authenticatedRoutes.owner
    : authenticatedRoutes.barber;

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
            search={user ? { tab: defaultProfileTab } : undefined}
            className="font-bold text-2xl tracking-tighter lg:text-3xl"
          >
            PanaBarbero
          </Link>
        </div>

        <nav className="flex flex-1 items-center justify-center">
          <div className="flex items-center font-medium text-sm md:space-x-4 lg:space-x-8">
            {user
              ? isBarber
                ? navigationRoutes.map((route) => (
                    <Button
                      key={route.to}
                      variant={currentPath === route.to ? "outline" : "ghost"}
                      nativeButton={false}
                      render={
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
                        />
                      }
                    >
                      {route.label}
                    </Button>
                  ))
                : authenticatedRoutes.navigation.map((route) => (
                    <Button
                      key={route.to}
                      variant={currentPath === route.to ? "outline" : "ghost"}
                      nativeButton={false}
                      render={
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
                        />
                      }
                    >
                      {route.label}
                    </Button>
                  ))
              : publicRoutes.navigation.map((route) => (
                  <Button
                    key={route.to}
                    variant={currentPath === route.to ? "outline" : "ghost"}
                    nativeButton={false}
                    render={
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
            <ClientOnly fallback={<Skeleton className="size-8" />}>
              <ThemeToggler />
            </ClientOnly>
          </div>
        </div>
      </div>
    </header>
  );
};
