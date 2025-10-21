import { tanstack } from "@panabarbero/constants";
import { Link, useRouterState } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

export const BottomBar = () => {
  const router = useRouterState();

  const currentPath = router.location.pathname;

  const { data: user } = useSession();

  const navigationRoutes = tanstack.getNavigationRoutes(user?._id);

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto max-w-md">
        <nav className="flex items-center justify-around p-4">
          {navigationRoutes.map((item) => {
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
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
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

        {false && (
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
