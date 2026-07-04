import { lazy, Suspense } from "react";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/hooks/use-session";
import { DashboardBreadcrumbs } from "./dashboard-breadcrumbs";

const NotificationsBell = lazy(() =>
  import("@/components/notifications/notifications-bell").then((mod) => ({
    default: mod.NotificationsBell,
  })),
);
const UserAvatar = lazy(() =>
  import("@/components/layout/user-avatar").then((mod) => ({
    default: mod.UserAvatar,
  })),
);

export function DashboardTopbar() {
  const { data: user } = useSession();

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b bg-card/95 px-4 backdrop-blur supports-backdrop-filter:bg-card/80 md:rounded-t-xl">
      <SidebarTrigger aria-label="Abrir menú" />
      <Separator className="h-4" orientation="vertical" />
      <DashboardBreadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        {user?.id && (
          <>
            <Suspense fallback={<Skeleton className="size-8" />}>
              <NotificationsBell />
            </Suspense>
            <div className="md:hidden">
              <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
                <UserAvatar
                  user={{
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                  }}
                />
              </Suspense>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
