import { Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/config";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { ThemeToggler } from "../theme-toggler";

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

/**
 * Slim mobile top bar — pairs with the bottom tab bar so the brand and account
 * utilities (notifications, avatar/sign-out, theme) stay reachable without a
 * full header. Hidden on desktop, where `<Header />` takes over.
 */
export function MobileTopBar() {
  const { user, isBarber } = useNavRoutes();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden">
      <Link
        className="font-bold text-xl tracking-tighter"
        search={user ? { tab: "account" } : undefined}
        to={
          user
            ? isBarber
              ? "/profile/barbershops/appointments"
              : "/profile"
            : "/"
        }
      >
        {APP_NAME}
      </Link>

      <div className="flex items-center gap-1.5">
        <ThemeToggler />

        {user?.id ? (
          <>
            <Suspense fallback={<Skeleton className="size-9" />}>
              <NotificationsBell />
            </Suspense>
            <Suspense fallback={<Skeleton className="size-8" />}>
              <UserAvatar
                user={{
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                }}
              />
            </Suspense>
          </>
        ) : (
          <Button nativeButton={false} render={<Link to="/login" />} size="sm">
            Iniciar sesión
          </Button>
        )}
      </div>
    </header>
  );
}
