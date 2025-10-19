import { tanstack } from "@panabarbero/constants";
import { useSession } from "@panabarbero/convex/auth";
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavigationRoute = (typeof tanstack.routes.navigation)[number];

export const BottomBar = () => {
  const router = useRouterState();

  const currentPath = router.location.pathname;

  const { data: session } = useSession();

  const isActive = (item: NavigationRoute) => {
    return currentPath === item.to;
  };

  const navigationRoutes = tanstack.getNavigationRoutes(session?.user?.id);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto max-w-md">
        <nav className="flex items-center justify-around p-4">
          {navigationRoutes.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.to}
                to={item.to}
                disabled={isActive(item)}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-2 transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
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
        </nav>

        {!session?.user && (
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
