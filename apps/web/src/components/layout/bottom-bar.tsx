import { Link, useRouterState } from "@tanstack/react-router";

import { authenticatedRoutes, publicRoutes } from "@/config";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import { useIsBarber } from "@/hooks/use-barbershop-members";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ThemeToggler } from "./theme-toggler";

export const BottomBar = () => {
  const router = useRouterState();

  const currentPath = router.location.pathname;

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const { data: rolesData } = useBarbershopMemberRoles(user?.userId ?? "");

  const defaultProfileTab = isBarber ? "account" : "appointments";

  const navigationRoutes = rolesData?.isOwner
    ? authenticatedRoutes.owner
    : authenticatedRoutes.barber;

  const routesWithoutHome = authenticatedRoutes.navigation.filter(
    (route) => route.to !== "/",
  );

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 mx-auto flex h-16 w-full items-center border-border border-t bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto">
        <nav className="flex h-full items-center justify-around gap-x-2 px-2">
          {user
            ? isBarber
              ? navigationRoutes.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      disabled={currentPath === item.to}
                      className={cn(
                        "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 text-muted-foreground",
                      )}
                      style={{
                        viewTransitionName: item.to,
                      }}
                      search={
                        item.to === "/profile"
                          ? { tab: defaultProfileTab }
                          : undefined
                      }
                    >
                      <Icon className="size-5 shrink-0" />
                      <span className="truncate font-medium text-xs leading-none">
                        {item.label}
                      </span>
                    </Link>
                  );
                })
              : routesWithoutHome.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      disabled={currentPath === item.to}
                      activeProps={{
                        className: "text-primary",
                      }}
                      className={cn(
                        "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 text-muted-foreground",
                      )}
                      style={{
                        viewTransitionName: item.to,
                      }}
                      search={
                        item.to === "/profile"
                          ? { tab: defaultProfileTab }
                          : undefined
                      }
                    >
                      <Icon className="size-5 shrink-0" />
                      <span className="truncate font-medium text-xs leading-none">
                        {item.label}
                      </span>
                    </Link>
                  );
                })
            : publicRoutes.navigation.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    disabled={currentPath === item.to}
                    activeProps={{
                      className: "text-primary",
                    }}
                    className={cn(
                      "flex w-full max-w-20 flex-col items-center justify-center gap-1.5 text-muted-foreground",
                    )}
                    style={{
                      viewTransitionName: item.to,
                    }}
                    search={
                      item.to === "/profile"
                        ? { tab: defaultProfileTab }
                        : undefined
                    }
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate font-medium text-xs leading-none">
                      {item.label}
                    </span>
                  </Link>
                );
              })}

          <ThemeToggler />
        </nav>
      </div>
    </div>
  );
};
