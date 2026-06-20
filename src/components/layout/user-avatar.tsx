import { SignOutIcon } from "@phosphor-icons/react";
import { useAuth } from "@workos/authkit-tanstack-react-start/client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";

interface UserAvatarProps {
  user: {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  };
}

export function UserAvatar({ user }: UserAvatarProps) {
  const { signOut } = useAuth();

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() || "U";

  return (
    <Popover>
      <PopoverTrigger
        nativeButton
        render={
          <Button
            variant="ghost"
            className="relative size-8 rounded-full md:mt-1.5"
          >
            <Avatar className="size-8">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || user.email}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
          </Button>
        }
      />
      <PopoverContent className="w-64" align="end" sideOffset={8}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage
                src={user.image || undefined}
                alt={user.name || user.email}
              />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-0.5 overflow-hidden">
              <p className="truncate font-medium text-sm leading-none">
                {user.name}
              </p>

              <p className="truncate text-muted-foreground text-xs">
                {user.email}
              </p>
            </div>
          </div>

          <Separator />

          <Button variant="destructive" onClick={() => void signOut()}>
            <SignOutIcon className="size-4" />
            Cerrar sesión
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
