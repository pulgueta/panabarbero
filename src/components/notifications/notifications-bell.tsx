import { BellIcon, CheckIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useIsBarber,
  useIsOwner,
  useIsStaff,
} from "@/hooks/use-barbershop-members";
import {
  useNotificationActions,
  useRecentNotifications,
  useUnreadNotificationsCount,
} from "@/hooks/use-notifications";
import { useSession } from "@/hooks/use-session";

import { NotificationRenderer } from "./notification-renderer";

export const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.userId ?? "");
  const { data: isStaff } = useIsStaff(user?.userId ?? "");
  const { data: isOwner } = useIsOwner(user?.userId ?? "");
  const usesBarberCalendar = Boolean(isBarber || isStaff || isOwner);

  const { data: recent, isLoading } = useRecentNotifications();
  const { data: unread = 0 } = useUnreadNotificationsCount();
  const { markReadMutation, markAllReadMutation } = useNotificationActions();

  const items = useMemo(() => recent ?? [], [recent]);
  const hasUnread = unread > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label={
              hasUnread
                ? `Notificaciones (${unread} sin leer)`
                : "Notificaciones"
            }
            className="relative"
          >
            <BellIcon weight={hasUnread ? "fill" : "regular"} />
            {hasUnread ? (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[10px] text-primary-foreground tabular-nums leading-none ring-2 ring-background"
              >
                {unread > 9 ? "9+" : unread}
              </span>
            ) : null}
          </Button>
        }
      />

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[min(22rem,calc(100vw-1.5rem))] gap-0 p-0"
      >
        <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm tracking-tight">
              Notificaciones
            </span>
            {hasUnread ? (
              <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
                {unread} sin leer
              </Badge>
            ) : null}
          </div>
          <Button
            variant="ghost"
            size="xs"
            disabled={!hasUnread || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate({})}
            className="gap-1 text-muted-foreground hover:text-foreground"
          >
            <CheckIcon />
            <span className="sr-only sm:not-sr-only">Marcar todas</span>
          </Button>
        </header>

        <ScrollArea className="max-h-88">
          <div className="flex flex-col gap-0.5 p-1.5">
            {isLoading ? (
              ["a", "b", "c"].map((key) => (
                <div
                  key={`notif-skeleton-${key}`}
                  className="flex items-start gap-3 rounded-md px-3 py-3"
                >
                  <Skeleton className="size-9 shrink-0 rounded-full" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-1/2" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <BellIcon weight="duotone" />
                </span>
                <div>
                  <p className="font-medium text-foreground text-sm">
                    Estás al día
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Aquí verás tus actualizaciones.
                  </p>
                </div>
              </div>
            ) : (
              items.map((notification) => (
                <NotificationRenderer
                  key={notification._id}
                  notification={notification}
                  usesBarberCalendar={usesBarberCalendar}
                  density="compact"
                  onMarkRead={(id) => markReadMutation.mutate({ id })}
                  onSelect={() => setOpen(false)}
                />
              ))
            )}
          </div>
        </ScrollArea>

        <footer className="border-t px-2 py-2">
          <Button
            variant="ghost"
            size="sm"
            nativeButton={false}
            onClick={() => setOpen(false)}
            render={
              <Link
                to="/profile"
                search={{ tab: "notifications" }}
                className="w-full justify-center"
              />
            }
          >
            Ver todas las notificaciones
          </Button>
        </footer>
      </PopoverContent>
    </Popover>
  );
};
