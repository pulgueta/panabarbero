import { tanstack } from "@panabarbero/constants";
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useIsBarber } from "@/hooks/use-barbers";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ThemeToggler } from "./theme-toggler";

export const BottomBar = () => {
  const router = useRouterState();

  const currentPath = router.location.pathname.split("/")[1];

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");

  const navigationRoutes = user
    ? tanstack.authenticatedRoutes.navigation
    : tanstack.publicRoutes.navigation;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto max-w-md">
        <nav className="flex items-center justify-around gap-x-1 px-4 py-2">
          {isBarber
            ? tanstack.authenticatedRoutes.barber.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    disabled={currentPath === item.to.split("/")[1]}
                    className={cn(
                      "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-4 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    )}
                    style={{
                      viewTransitionName: item.to,
                    }}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate font-medium text-xs leading-none">
                      {item.label}
                    </span>
                  </Link>
                );
              })
            : navigationRoutes.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    disabled={currentPath === item.to}
                    activeProps={{
                      className: "bg-primary/10 text-primary",
                    }}
                    className={cn(
                      "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-4 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                    )}
                    style={{
                      viewTransitionName: item.to,
                    }}
                  >
                    <Icon className="size-5 shrink-0" />
                    <span className="truncate font-medium text-xs leading-none">
                      {item.label}
                    </span>
                  </Link>
                );
              })}

          <div className="flex items-center space-x-2">
            <ThemeToggler />
          </div>
        </nav>

        {!user && (
          <div className="px-4 pb-4">
            <Button asChild className="w-full">
              <Link to="/login">Iniciar sesión</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
