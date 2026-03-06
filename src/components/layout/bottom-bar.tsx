import { PlusIcon, SignOutIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
} from "@/components/ui/drawer";
import { useNavRoutes } from "@/hooks/use-nav-routes";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { ThemeToggler } from "./theme-toggler";

export const BottomBar = () => {
  const [open, setOpen] = useState(false);

  const { trigger } = useWebHaptics();

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
      <div className="fixed right-0 bottom-0 left-0 z-50 flex h-18 w-full items-center justify-center gap-4 border-border border-t bg-background/20 px-4 backdrop-blur-sm md:hidden dark:bg-secondary/40">
        <Button
          onClick={() => {
            trigger();
            setOpen(true);
          }}
          className="w-full max-w-16 rounded-full font-medium"
          size="lg"
        >
          <PlusIcon size={32} />
          <span className="sr-only">Abrir menú de navegación</span>
        </Button>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="px-4">
          <nav className="mt-2 grid grid-cols-2 gap-1">
            {routes.map((item) => {
              const Icon = item.icon;

              return (
                <DrawerClose key={item.to}>
                  <Link
                    to={item.to}
                    onClick={() => {
                      trigger();
                    }}
                    search={
                      item.to === "/profile" ? { tab: "account" } : undefined
                    }
                    style={{ viewTransitionName: item.to }}
                    activeProps={{
                      className: "bg-primary/10 text-primary",
                    }}
                    className={cn(
                      "mx-auto flex w-32 flex-col items-center gap-4 rounded-xl py-4 font-medium text-muted-foreground text-sm",
                    )}
                  >
                    <Icon weight="duotone" />
                    <span>{item.label}</span>
                  </Link>
                </DrawerClose>
              );
            })}
          </nav>

          <DrawerFooter className="flex-row items-center justify-between">
            {user ? (
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="flex-1"
              >
                <SignOutIcon />
                Cerrar sesión
              </Button>
            ) : (
              <Button
                className="flex-1 text-center"
                render={<Link to="/login" />}
                nativeButton={false}
              >
                Iniciar sesión
              </Button>
            )}

            <ThemeToggler size="sm" />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};
