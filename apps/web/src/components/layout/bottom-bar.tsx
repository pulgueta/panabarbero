import { tanstack } from "@panabarbero/constants";
import { signOut } from "@panabarbero/convex/auth";
import { Link, redirect, useRouterState } from "@tanstack/react-router";
import { LogOut } from "lucide-react";

import { useIsBarber } from "@/hooks/use-barbers";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";
import { ThemeToggler } from "./theme-toggler";

export const BottomBar = () => {
  const router = useRouterState();

  const currentPath = router.location.pathname;

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");

  const navigationRoutes = user
    ? tanstack.authenticatedRoutes.navigation
    : tanstack.publicRoutes.navigation;

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          throw redirect({
            to: "/login",
          });
        },
      },
    });
  };

  return (
    <div className="fixed right-0 bottom-4 left-0 z-50 mx-auto h-16 max-w-[calc(100dvw-2rem)] rounded-full border border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto">
        <nav className="flex h-full items-center justify-around gap-x-2.5 px-4 py-2">
          {isBarber ? (
            <>
              {tanstack.authenticatedRoutes.barber.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    disabled={currentPath === item.to}
                    className={cn(
                      "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 pt-1.5 pb-2 text-muted-foreground",
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

              <div className="pb-1">
                <button
                  type="button"
                  className={cn(
                    "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 rounded-xl pt-1.5 text-destructive text-xs",
                  )}
                  onClick={handleSignOut}
                >
                  <LogOut className="size-5 shrink-0" />
                  Cerrar sesión
                </button>
              </div>
            </>
          ) : (
            navigationRoutes.map((item) => {
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
                    "flex max-w-24 flex-1 flex-col items-center justify-center gap-1.5 pt-1.5 pb-2 text-muted-foreground",
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
          )}

          <div className="pb-1">
            <ThemeToggler />
          </div>
        </nav>
      </div>
    </div>
  );
};
