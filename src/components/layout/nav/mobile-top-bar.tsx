import { ListIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_NAME } from "@/config";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { cn } from "@/lib/utils";
import { ThemeToggler } from "../theme-toggler";
import { getMobileMenuGroups, useNavSearch } from "./nav-data";
import { useActiveRoute } from "./use-active-route";

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
 * Mobile site chrome: the brand plus the persona's primary destination stay
 * in the top bar; every other link lives in the menu drawer. There is no
 * bottom tab bar. Hidden on desktop and inside the dashboard shell, which
 * bring their own chrome.
 */
export function MobileTopBar() {
  const { user, isBarber, isStaff, isOwner } = useNavRoutes();
  const [menuOpen, setMenuOpen] = useState(false);
  const navSearch = useNavSearch();
  const { trigger } = useWebHaptics();

  const isMember = isBarber || isStaff || isOwner;
  const groups = getMobileMenuGroups(Boolean(user));
  const activeTo = useActiveRoute(groups.flatMap((group) => group.items));

  const closeMenu = () => {
    trigger();
    setMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b bg-background/80 px-4 backdrop-blur supports-backdrop-filter:bg-background/60 md:hidden">
        <Link
          className="font-bold text-xl tracking-tighter"
          search={user ? { tab: "account" } : undefined}
          to={
            user
              ? isMember
                ? "/profile/barbershops/appointments"
                : "/profile"
              : "/"
          }
        >
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-1.5">
          {isMember ? (
            <Button
              nativeButton={false}
              render={
                <Link
                  search={navSearch("/profile/barbershops/appointments")}
                  to="/profile/barbershops/appointments"
                />
              }
              size="sm"
              variant="secondary"
            >
              <SquaresFourIcon />
              Panel
            </Button>
          ) : (
            <Button
              nativeButton={false}
              render={
                <Link search={navSearch("/barbershops")} to="/barbershops" />
              }
              size="sm"
            >
              Reservar
            </Button>
          )}

          {user?.id && (
            <>
              <Suspense fallback={<Skeleton className="size-8" />}>
                <NotificationsBell />
              </Suspense>
              <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
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
          )}

          <Button
            aria-label="Abrir menú"
            onClick={() => setMenuOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <ListIcon />
          </Button>
        </div>
      </header>

      <Drawer onOpenChange={setMenuOpen} open={menuOpen} swipeDirection="right">
        <DrawerContent className="md:hidden">
          <DrawerHeader className="border-b">
            <DrawerTitle>Menú</DrawerTitle>
          </DrawerHeader>

          <nav
            aria-label="Navegación principal"
            className="flex-1 overflow-y-auto p-3"
          >
            {groups.map((group) => (
              <div className="mb-4 last:mb-0" key={group.label}>
                <p className="px-3 pb-1 font-medium text-muted-foreground text-xs">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = activeTo === item.to;
                    const Icon = item.icon;

                    return (
                      <li key={item.to}>
                        <Link
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "flex h-11 items-center gap-3 rounded-lg px-3 font-medium text-sm transition-colors",
                            isActive
                              ? "bg-muted text-primary"
                              : "text-foreground hover:bg-muted",
                          )}
                          onClick={closeMenu}
                          search={navSearch(item.to)}
                          to={item.to}
                        >
                          <Icon
                            className="size-4"
                            weight={isActive ? "fill" : "bold"}
                          />
                          {item.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <DrawerFooter className="border-t p-3">
            <div className="flex items-center justify-between px-3">
              <span className="text-muted-foreground text-sm">Tema</span>
              <ThemeToggler size="sm" />
            </div>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
}
