import type { InAppNotification } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import {
  createContext,
  type FC,
  type ReactNode,
  useContext,
  useMemo,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * `NotificationItem` is a compound component. The root provides shared state
 * (notification row, density, onMarkRead) via context; `Icon`, `Title`,
 * `Description`, `Meta`, and `Actions` are slots the variant components
 * compose. This lets each kind tailor its icon, copy emphasis, or quick
 * actions without adding a growing list of boolean props to the root.
 */

export type NotificationDensity = "compact" | "comfortable";

export interface NotificationItemContextValue {
  notification: InAppNotification;
  density: NotificationDensity;
  isUnread: boolean;
  onMarkRead?: (id: InAppNotification["_id"]) => void;
}

const NotificationItemContext =
  createContext<NotificationItemContextValue | null>(null);

function useNotificationItem() {
  const ctx = useContext(NotificationItemContext);

  if (!ctx) {
    throw new Error("NotificationItem.* must render inside NotificationItem");
  }

  return ctx;
}

interface NotificationItemRootProps {
  notification: InAppNotification;
  density?: NotificationDensity;
  onMarkRead?: (id: InAppNotification["_id"]) => void;
  onSelect?: () => void;
  children: ReactNode;
  className?: string;
}

const NotificationItemRoot: FC<NotificationItemRootProps> = ({
  notification,
  density = "comfortable",
  onMarkRead,
  onSelect,
  children,
  className,
}) => {
  const isUnread = !notification.readAt;

  const value = useMemo<NotificationItemContextValue>(
    () => ({ notification, density, isUnread, onMarkRead }),
    [notification, density, isUnread, onMarkRead],
  );

  return (
    <NotificationItemContext.Provider value={value}>
      <article
        data-slot="notification-item"
        data-unread={isUnread || undefined}
        data-density={density}
        onClick={() => {
          if (isUnread) {
            onMarkRead?.(notification._id);
          }

          onSelect?.();
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          if (isUnread) {
            onMarkRead?.(notification._id);
          }
          onSelect?.();
        }}
        className={cn(
          // Base row: relies on CSS vars so light/dark stay coherent.
          "group/notif relative isolate grid cursor-pointer grid-cols-[auto_1fr_auto] items-start gap-3 rounded-lg border border-transparent bg-transparent px-3 text-left outline-none transition-colors",
          density === "compact" ? "py-2.5" : "py-3.5",
          // Subtle inset strip + accent dot for unread rows.
          "data-unread:border-border/60 data-unread:bg-muted/40",
          // Hover + focus affordances.
          "hover:border-border/70 hover:bg-muted/60 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
          className,
        )}
      >
        {children}
        {/* Unread accent: a thin primary bar hugging the left edge. */}
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary opacity-0 transition-opacity",
            "group-data-unread/notif:opacity-100",
          )}
        />
      </article>
    </NotificationItemContext.Provider>
  );
};

const NotificationItemIcon: FC<{
  icon: ReactNode;
  tone?: "primary" | "warning" | "success" | "destructive" | "muted";
  className?: string;
}> = ({ icon, tone = "primary", className }) => {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    warning: "bg-warning/15 text-warning",
    success: "bg-success/15 text-success-foreground",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[tone];

  return (
    <span
      data-slot="notification-icon"
      className={cn(
        "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full ring-1 ring-border/40 [&_svg]:size-4",
        toneClass,
        className,
      )}
    >
      {icon}
    </span>
  );
};

const NotificationItemBody: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div
    data-slot="notification-body"
    className={cn("flex min-w-0 flex-col gap-0.5", className)}
  >
    {children}
  </div>
);

const NotificationItemTitle: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const { density } = useNotificationItem();

  return (
    <h3
      data-slot="notification-title"
      className={cn(
        "truncate font-medium text-foreground tracking-tight",
        density === "compact" ? "text-sm" : "text-sm",
        className,
      )}
    >
      {children}
    </h3>
  );
};

const NotificationItemDescription: FC<{
  children: ReactNode;
  className?: string;
  clamp?: 1 | 2 | 3;
}> = ({ children, className, clamp = 2 }) => (
  <p
    data-slot="notification-description"
    className={cn(
      "text-muted-foreground text-xs leading-relaxed",
      clamp === 1 && "line-clamp-1",
      clamp === 2 && "line-clamp-2",
      clamp === 3 && "line-clamp-3",
      className,
    )}
  >
    {children}
  </p>
);

const NotificationItemMeta: FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <span
    data-slot="notification-meta"
    className={cn(
      "inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 tabular-nums tracking-wide",
      className,
    )}
  >
    {children}
  </span>
);

interface NotificationItemActionProps {
  children: ReactNode;
  to: string;
  /** TanStack Router search params for in-app routes (e.g. `tab` or `date`). */
  search?: Record<string, unknown>;
  external?: boolean;
  onClick?: (event: React.MouseEvent) => void;
}

/**
 * Quick action button rendered at the trailing edge. Accepts either a
 * TanStack Router path (relative to the app) or an external absolute URL.
 */
const NotificationItemAction: FC<NotificationItemActionProps> = ({
  children,
  to,
  search,
  external,
  onClick,
}) => {
  const { density } = useNotificationItem();
  const isExternal = external || /^https?:\/\//.test(to);

  return (
    <Button
      size="sm"
      variant="ghost"
      nativeButton={false}
      onClick={(event) => {
        event.stopPropagation();
        onClick?.(event);
      }}
      render={
        isExternal ? (
          <a href={to} target="_blank" rel="noreferrer noopener">
            {children}
          </a>
        ) : (
          <Link to={to} search={search}>
            {children}
          </Link>
        )
      }
      className={cn(
        "shrink-0 text-primary hover:bg-primary/10 hover:text-primary",
        // Compact rows (popover) hide the action until hover/focus keeps rows calm.
        density === "compact" &&
          "opacity-0 transition-opacity group-focus-within/notif:opacity-100 group-hover/notif:opacity-100 motion-safe:duration-150",
      )}
    >
      {children}
    </Button>
  );
};

export const NotificationItem = Object.assign(NotificationItemRoot, {
  Icon: NotificationItemIcon,
  Body: NotificationItemBody,
  Title: NotificationItemTitle,
  Description: NotificationItemDescription,
  Meta: NotificationItemMeta,
  Action: NotificationItemAction,
});

export { useNotificationItem };
