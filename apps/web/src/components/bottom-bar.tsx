import { useSession } from "@panabarbero/convex/auth";
import { Link, useRouterState } from "@tanstack/react-router";
import { Calendar, Home, Scissors, User } from "lucide-react";
import type { ComponentType } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BottomBarItem {
  icon: ComponentType<{ className?: string }>;
  label: string;
  to: string;
  activePattern?: string;
}

const navigationItems: BottomBarItem[] = [
  {
    icon: Home,
    label: "Inicio",
    to: "/",
    activePattern: "^/$",
  },
  {
    icon: Scissors,
    label: "Barberías",
    to: "/barbershops",
    activePattern: "^/barbershops",
  },
  {
    icon: Calendar,
    label: "Citas",
    to: "/appointments",
    activePattern: "^/appointments",
  },
];

export function BottomBar() {
  const { data: session } = useSession();
  const router = useRouterState();
  const currentPath = router.location.pathname;

  const isActive = (item: BottomBarItem) => {
    if (item.activePattern) {
      return new RegExp(item.activePattern).test(currentPath);
    }

    return currentPath === item.to;
  };

  const allItems = session?.user
    ? [
        ...navigationItems,
        {
          icon: User,
          label: "Perfil",
          to: "/profile",
          activePattern: "^/profile",
        },
      ]
    : navigationItems;

  return (
    <div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/90 backdrop-blur-sm">
      <div className="container mx-auto max-w-md">
        <nav className="flex items-center justify-around p-4">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
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
}
