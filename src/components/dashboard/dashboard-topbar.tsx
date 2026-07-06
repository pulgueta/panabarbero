import { lazy, Suspense } from "react";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";
import { DASHBOARD_GUTTER_X } from "./dashboard-gutter";

const NotificationsBell = lazy(() =>
  import("@/components/notifications/notifications-bell").then((mod) => ({
    default: mod.NotificationsBell,
  })),
);

export function DashboardTopbar() {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/80 md:rounded-t-xl",
        DASHBOARD_GUTTER_X,
      )}
    >
      <SidebarTrigger className="-ml-1" aria-label="Abrir menú" />
      <DashboardBreadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <Suspense fallback={<Skeleton className="size-8" />}>
          <NotificationsBell />
        </Suspense>
      </div>
    </header>
  );
}
