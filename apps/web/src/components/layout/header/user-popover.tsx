import { signOut } from "@panabarbero/convex/auth";
import { Link } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useIsBarber } from "@/hooks/use-barbers";
import type { useSession } from "@/hooks/use-session";

export const UserPopover: FC<ReturnType<typeof useSession>["data"]> = (
  user,
) => {
  const isBarber = useIsBarber(user?.userId ?? "");

  const handleSignOut = async () => {
    await signOut();
  };

  const getUserInitials = () => {
    if (!user?.name) return "AN";

    const names = user.name.split(" ");

    return names
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Avatar className="cursor-pointer">
          <AvatarImage src={user?.image ?? undefined} />
          <AvatarFallback>{getUserInitials()}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="w-full max-w-sm tracking-tight" align="end">
        <div className="flex flex-col space-y-1">
          <p className="font-medium text-sm leading-none">{user?.name}</p>
          <p className="text-muted-foreground text-xs leading-none">
            {user?.email}
          </p>
        </div>

        <Separator className="mt-4 mb-2" />

        <div className="flex flex-col items-start space-y-1 text-pretty">
          {isBarber ? (
            <>
              <Button
                variant="link"
                className="w-full justify-start p-0 text-foreground"
                size="sm"
                asChild
              >
                <Link to="/barbershop-settings">
                  Configuración de la barbería
                </Link>
              </Button>
              <Button
                variant="link"
                className="w-full justify-start p-0 text-foreground"
                size="sm"
                asChild
              >
                <Link to="/analytics">Analíticas</Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="link"
                className="w-full justify-start p-0 text-foreground"
                size="sm"
                asChild
              >
                <Link to="/appointments">Mis Citas</Link>
              </Button>
              <Button
                variant="link"
                className="w-full justify-start p-0 text-foreground"
                size="sm"
                asChild
              >
                <Link to="/reviews">Mis Reseñas</Link>
              </Button>
            </>
          )}

          <Separator className="my-2" />

          <Button
            variant="destructive"
            size="sm"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="size-4" />
            Cerrar Sesión
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
