import type { InAppNotification } from "@convex/schema";
import { BellSimpleIcon, CheckIcon, SparkleIcon } from "@phosphor-icons/react";
import type { Dispatch, FC, SetStateAction } from "react";
import { Suspense, useMemo, useState } from "react";

import { ProfileTabSkeleton } from "@/components/layout/skeleton/profile-tab-skeleton";
import { NotificationRenderer } from "@/components/notifications/notification-renderer";
import { getSectionLabel } from "@/components/notifications/relative-time";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyTitle } from "@/components/ui/empty";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useIsBarber,
  useIsOwner,
  useIsStaff,
} from "@/hooks/use-barbershop-members";
import {
  useLastRead,
  useNotificationActions,
  useNotificationsPage,
  useUnreadNotificationsCount,
  useUnreadNotificationsPage,
} from "@/hooks/use-notifications";
import { useSession } from "@/hooks/use-session";

type NotificationsFilter = "all" | "unread";

const PAGE_SIZE = 20;

type PageBodyProps = {
  cursor: string | null;
  setCursor: (c: string | null) => void;
  cursorStack: Array<string | null>;
  setCursorStack: Dispatch<SetStateAction<Array<string | null>>>;
  usesBarberCalendar: boolean;
};

const NotificationsAllPageBody: FC<PageBodyProps> = ({
  cursor,
  setCursor,
  cursorStack,
  setCursorStack,
  usesBarberCalendar,
}) => {
  const { data: page } = useNotificationsPage({
    cursor,
    numItems: PAGE_SIZE,
  });
  const { data: lastRead } = useLastRead();

  const visible = useMemo<InAppNotification[]>(
    () => (page && "page" in page ? (page.page as InAppNotification[]) : []),
    [page],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, InAppNotification[]>();

    for (const notification of visible) {
      const label = getSectionLabel(notification._creationTime);
      const existing = buckets.get(label);

      if (existing) {
        existing.push(notification);
      } else {
        buckets.set(label, [notification]);
      }
    }

    return Array.from(buckets.entries());
  }, [visible]);

  const hasNextPage = Boolean(
    page && "isDone" in page && !page.isDone && page.continueCursor,
  );
  const canGoPrevious = cursorStack.length > 0;

  return (
    <>
      {visible.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <BellSimpleIcon weight="duotone" />
          </div>
          <EmptyTitle>Estás al día</EmptyTitle>
          <EmptyDescription>
            Las actualizaciones de tus citas aparecerán aquí en cuanto sucedan.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([label, rows]) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  {label}
                </h3>
                <div className="h-px flex-1 bg-border/80" />
              </div>
              <ul className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/40 p-1.5">
                {rows.map((notification) => (
                  <li key={notification._id}>
                    <NotificationRenderer
                      notification={notification}
                      usesBarberCalendar={usesBarberCalendar}
                      density="comfortable"
                      isUnread={notification._creationTime > (lastRead ?? 0)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canGoPrevious}
          onClick={() => {
            setCursorStack((prev) => {
              const next = [...prev];
              const previous = next.pop() ?? null;
              setCursor(previous);
              return next;
            });
          }}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          disabled={!hasNextPage}
          onClick={() => {
            if (!page || !("continueCursor" in page)) return;
            setCursorStack((prev) => [...prev, cursor]);
            setCursor(page.continueCursor);
          }}
        >
          Siguiente
        </Button>
      </footer>
    </>
  );
};

const NotificationsUnreadPageBody: FC<PageBodyProps> = ({
  cursor,
  setCursor,
  cursorStack,
  setCursorStack,
  usesBarberCalendar,
}) => {
  const { data: page } = useUnreadNotificationsPage({
    cursor,
    numItems: PAGE_SIZE,
  });
  const { data: lastRead } = useLastRead();

  const visible = useMemo<InAppNotification[]>(
    () => (page && "page" in page ? (page.page as InAppNotification[]) : []),
    [page],
  );

  const grouped = useMemo(() => {
    const buckets = new Map<string, InAppNotification[]>();

    for (const notification of visible) {
      const label = getSectionLabel(notification._creationTime);
      const existing = buckets.get(label);

      if (existing) {
        existing.push(notification);
      } else {
        buckets.set(label, [notification]);
      }
    }

    return Array.from(buckets.entries());
  }, [visible]);

  const hasNextPage = Boolean(
    page && "isDone" in page && !page.isDone && page.continueCursor,
  );
  const canGoPrevious = cursorStack.length > 0;

  return (
    <>
      {visible.length === 0 ? (
        <Empty className="rounded-xl border border-dashed py-16">
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SparkleIcon weight="duotone" />
          </div>
          <EmptyTitle>No tienes notificaciones sin leer</EmptyTitle>
          <EmptyDescription>
            Cuando llegue algo nuevo, aparecerá aquí.
          </EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map(([label, rows]) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h3 className="font-medium text-muted-foreground text-xs uppercase tracking-[0.14em]">
                  {label}
                </h3>
                <div className="h-px flex-1 bg-border/80" />
              </div>
              <ul className="flex flex-col gap-1 rounded-xl border border-border/60 bg-card/40 p-1.5">
                {rows.map((notification) => (
                  <li key={notification._id}>
                    <NotificationRenderer
                      notification={notification}
                      usesBarberCalendar={usesBarberCalendar}
                      density="comfortable"
                      isUnread={notification._creationTime > (lastRead ?? 0)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <footer className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={!canGoPrevious}
          onClick={() => {
            setCursorStack((prev) => {
              const next = [...prev];
              const previous = next.pop() ?? null;
              setCursor(previous);
              return next;
            });
          }}
        >
          Anterior
        </Button>
        <Button
          size="sm"
          disabled={!hasNextPage}
          onClick={() => {
            if (!page || !("continueCursor" in page)) return;
            setCursorStack((prev) => [...prev, cursor]);
            setCursor(page.continueCursor);
          }}
        >
          Siguiente
        </Button>
      </footer>
    </>
  );
};

export const NotificationsTab = () => {
  const [filter, setFilter] = useState<NotificationsFilter>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([]);

  const { data: user } = useSession();
  const { data: isBarber } = useIsBarber(user?.id ?? "");
  const { data: isStaff } = useIsStaff(user?.id ?? "");
  const { data: isOwner } = useIsOwner(user?.id ?? "");
  const usesBarberCalendar = Boolean(isBarber || isStaff || isOwner);

  const { data: unread } = useUnreadNotificationsCount();
  const { markAllReadMutation } = useNotificationActions();

  const pageBodyProps: PageBodyProps = {
    cursor,
    setCursor,
    cursorStack,
    setCursorStack,
    usesBarberCalendar,
  };

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-semibold text-foreground text-xl tracking-tight">
            Notificaciones
          </h2>
          <p className="text-muted-foreground text-sm">
            {unread
              ? `Tienes ${unread} ${unread === 1 ? "notificación nueva" : "notificaciones nuevas"}.`
              : "Aquí verás tus actualizaciones en tiempo real."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            value={filter}
            onValueChange={(v) => {
              setFilter(v as NotificationsFilter);
              setCursor(null);
              setCursorStack([]);
            }}
            orientation="horizontal"
          >
            <TabsList variant="default" className="h-9">
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="unread" className="gap-1.5">
                Sin leer
                {unread ? (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 font-medium text-[11px] text-primary-foreground tabular-nums">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <Button
            variant="outline"
            size="sm"
            disabled={unread === 0 || markAllReadMutation.isPending}
            onClick={() => markAllReadMutation.mutate({})}
          >
            <CheckIcon />
            Marcar todas como leídas
          </Button>
        </div>
      </header>

      <Suspense key={filter} fallback={<ProfileTabSkeleton />}>
        {filter === "all" ? (
          <NotificationsAllPageBody {...pageBodyProps} />
        ) : (
          <NotificationsUnreadPageBody {...pageBodyProps} />
        )}
      </Suspense>
    </section>
  );
};
