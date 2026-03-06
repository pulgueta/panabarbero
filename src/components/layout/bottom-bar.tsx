import { PlusIcon, SignOutIcon } from "@phosphor-icons/react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerFooter } from "@/components/ui/drawer";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export const BottomBar = () => {
  const [open, setOpen] = useState(false);
  const router = useRouterState();
  const currentPath = router.location.pathname;
  const { routes, user } = useNavRoutes();

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          location.reload();
        },
      },
    });
  };

  return (
    <>
      {/* Fixed bottom bar with single FAB */}
      <div className="fixed right-0 bottom-0 left-0 z-50 flex h-16 w-full items-center justify-center border-border border-t bg-background/90 px-4 backdrop-blur-sm supports-[padding-bottom:env(safe-area-inset-bottom)]:pb-[env(safe-area-inset-bottom)]">
        <Button
          variant="default"
          onClick={() => setOpen(true)}
          className="h-10 w-full max-w-xs gap-2 rounded-full px-6 font-medium text-sm"
          aria-label="Abrir menú de navegación"
        >
          <PlusIcon size={20} weight="duotone" />
          Menú
        </Button>
      </div>

      {/* Navigation drawer — always a Drawer since BottomBar is mobile-only */}
      <Drawer open={open} onOpenChange={setOpen} swipeDirection="down">
        <DrawerContent>
          <nav className="flex flex-col gap-1 px-3 pt-2 pb-2">
            {routes.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  search={
                    item.to === "/profile" ? { tab: "account" } : undefined
                  }
                  style={{ viewTransitionName: item.to }}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl px-4 py-3.5 font-medium text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon size={16} weight="duotone" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {user && (
            <DrawerFooter>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="w-full justify-start gap-3"
              >
                <SignOutIcon size={24} weight="duotone" />
                Cerrar sesión
              </Button>
            </DrawerFooter>
          )}
        </DrawerContent>
      </Drawer>
    </>
  );
};
