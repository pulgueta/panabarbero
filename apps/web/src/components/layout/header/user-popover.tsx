import { signOut } from "@panabarbero/convex/auth";
import { useNavigate } from "@tanstack/react-router";
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
import { useIsBarber } from "@/hooks/use-barbershop-members";
import type { useSession } from "@/hooks/use-session";

export const UserPopover: FC<ReturnType<typeof useSession>["data"]> = (
  user,
) => {
  const navigate = useNavigate();

  const { data: isBarber } = useIsBarber(user?.userId ?? "");

  const handleSignOut = async () => {
    await signOut();

    throw navigate({ to: "/login", replace: true });
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
        <div className="flex flex-col space-y-2">
          <p className="font-medium text-sm leading-none">{user?.name}</p>
          <p className="text-muted-foreground text-xs leading-none">
            {isBarber ? "Barbero" : "Cliente"}
          </p>
        </div>

        <Separator className="my-2" />

        <Button
          variant="destructive"
          onClick={handleSignOut}
          className="w-full"
        >
          <LogOut className="size-4" />
          Cerrar Sesión
        </Button>
      </PopoverContent>
    </Popover>
  );
};
