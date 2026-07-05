import {
  BrainIcon,
  ChatCircleIcon,
  ListIcon,
  NotePencilIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useParams,
} from "@tanstack/react-router";
import { useState } from "react";

import { RecentChats } from "@/components/chat/recent-chats";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { cacheTime } from "@/config/cache";
import { getPanaAccessQueryOptions } from "@/hooks/billing/use-pana-access";
import { useAnonId } from "@/hooks/use-anon-id";
import { myThreadsQueryOptions, useMyThreads } from "@/hooks/use-chat";
import { useSession } from "@/hooks/use-session";
import { chatViewTransition } from "@/lib/chat-view-transition";
import { cn } from "@/lib/utils";

const PANA_NAV = [
  {
    label: "Chat",
    description: "Conversaciones y acciones asistidas.",
    to: "/profile/barbershops/pana",
    icon: ChatCircleIcon,
  },
  {
    label: "Conocimiento",
    description: "Datos que Pana usa sobre la barbería.",
    to: "/profile/barbershops/pana/knowledge",
    icon: BrainIcon,
  },
  {
    label: "Memoria",
    description: "Preferencias y señales de seguimiento.",
    to: "/profile/barbershops/pana/memory",
    icon: SparkleIcon,
  },
] as const;

export const Route = createFileRoute("/_authedRoutes/profile/barbershops/pana")(
  {
    component: PanaLayout,
    pendingComponent: PanaPending,
    ssr: "data-only",
    staticData: { breadcrumb: "Pana" },
    staleTime: cacheTime.high,
    gcTime: cacheTime.extreme,
    loader: ({ context }) => {
      const userId = context.userId;

      if (userId) {
        void context.queryClient.prefetchQuery(myThreadsQueryOptions(userId));
        void context.queryClient.prefetchQuery(getPanaAccessQueryOptions());
      }
    },
  },
);

function PanaPending() {
  return (
    <div className="grid min-h-[calc(100dvh-9rem)] overflow-hidden rounded-lg border bg-background lg:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="hidden border-r lg:block">
        <div className="space-y-4 p-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </aside>
      <div className="flex min-h-0 flex-col">
        <div className="flex h-14 items-center border-b px-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <Skeleton className="h-40 w-full max-w-md" />
        </div>
      </div>
    </div>
  );
}

function PanaLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const threadId = useParams({
    strict: false,
    select: (params) => params.threadId,
  });

  return (
    <div className="grid min-h-[calc(100dvh-9rem)] overflow-hidden rounded-lg border bg-background lg:grid-cols-[18rem_minmax(0,1fr)]">
      <PanaSidebar className="hidden border-r lg:flex" threadId={threadId} />

      <Drawer
        onOpenChange={setDrawerOpen}
        open={drawerOpen}
        swipeDirection="left"
      >
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Pana</DrawerTitle>
          </DrawerHeader>
          <PanaSidebar
            className="h-[calc(100dvh-5rem)]"
            onSelect={() => setDrawerOpen(false)}
            threadId={threadId}
          />
        </DrawerContent>
      </Drawer>

      <section className="flex min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3">
          <Button
            aria-label="Abrir navegación de Pana"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            size="icon-sm"
            variant="ghost"
          >
            <ListIcon className="size-4" />
          </Button>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">Pana</p>
            <p className="truncate text-muted-foreground text-xs">
              Asistente interno de operación
            </p>
          </div>
          <Button
            aria-label="Nuevo chat"
            className="ml-auto"
            nativeButton={false}
            render={
              <Link
                to="/profile/barbershops/pana"
                viewTransition={chatViewTransition}
              />
            }
            size="icon-sm"
            variant="ghost"
          >
            <NotePencilIcon className="size-4" />
          </Button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </section>
    </div>
  );
}

interface PanaSidebarProps {
  className?: string;
  onSelect?: () => void;
  threadId?: string;
}

function PanaSidebar({ className, onSelect, threadId }: PanaSidebarProps) {
  const { pathname } = useLocation();
  const { data: user } = useSession();
  const anonId = useAnonId();
  const userId = user?.id ?? anonId;
  const { data: threadsData, isPending } = useMyThreads(userId);
  const threads = threadsData?.page ?? [];

  return (
    <aside className={cn("min-h-0 flex-col", className)}>
      <div className="border-b p-3">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <SparkleIcon className="size-4" weight="fill" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-sm">Pana</p>
            <p className="truncate text-muted-foreground text-xs">
              Tu copiloto de barbería
            </p>
          </div>
        </div>
      </div>

      <nav aria-label="Secciones de Pana" className="grid gap-1 border-b p-2">
        {PANA_NAV.map((item) => {
          const isActive =
            pathname === item.to ||
            (item.to !== "/profile/barbershops/pana" &&
              pathname.startsWith(item.to));
          const Icon = item.icon;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={buttonVariants({
                className:
                  "h-auto w-full justify-start gap-2 whitespace-normal px-2 py-2 text-left",
                variant: isActive ? "outline" : "ghost",
              })}
              key={item.to}
              onClick={onSelect}
              to={item.to}
            >
              <Icon
                className="mt-0.5 size-4 shrink-0"
                weight={isActive ? "fill" : "regular"}
              />
              <span className="min-w-0">
                <span className="block font-medium leading-5">
                  {item.label}
                </span>
                <span className="block text-muted-foreground text-xs leading-4">
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <RecentChats
        activeThreadId={threadId}
        isLoading={isPending}
        onSelect={onSelect}
        routeScope="dashboard"
        threads={threads}
      />
    </aside>
  );
}
