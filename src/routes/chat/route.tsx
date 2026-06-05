import { ListIcon, NotePencilIcon } from "@phosphor-icons/react";
import {
  createFileRoute,
  Link,
  Outlet,
  useParams,
} from "@tanstack/react-router";

import { RecentChats } from "@/components/chat/recent-chats";
import { BorderContainer } from "@/components/layout/border-container";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getPanaAccessQueryOptions } from "@/hooks/billing/use-pana-access";
import { useAnonId } from "@/hooks/use-anon-id";
import { myThreadsQueryOptions, useMyThreads } from "@/hooks/use-chat";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { chatViewTransition } from "@/lib/chat-view-transition";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/chat")({
  component: ChatLayout,
  ssr: "data-only",
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await Promise.all([
        context.queryClient.ensureQueryData(myThreadsQueryOptions(user.userId)),
        context.queryClient.ensureQueryData(getPanaAccessQueryOptions()),
      ]);
    }
  },
});

function ChatLayout() {
  return (
    <SidebarProvider className="block min-h-0">
      <ChatShell />
    </SidebarProvider>
  );
}

function ChatShell() {
  const threadId = useParams({
    strict: false,
    select: (params) => params.threadId,
  });

  const { data: user } = useSession();
  const anonId = useAnonId();
  const userId = user?.userId ?? anonId;

  const { data: threadsData, isPending } = useMyThreads(userId);
  const threads = threadsData?.page ?? [];

  const { open, openMobile, setOpenMobile } = useSidebar();

  return (
    <BorderContainer className="flex px-0 py-0 md:pb-0">
      <aside
        aria-label="Conversaciones recientes"
        className={cn(
          "hidden shrink-0 flex-col transition-[width] duration-300 ease-in-out md:flex",
          open ? "min-w-72 max-w-72 border-r" : "w-0 overflow-hidden",
        )}
        style={{ viewTransitionName: "chat-sidebar" }}
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b">
          <span className="text-center font-semibold">Conversaciones</span>
          <SidebarTrigger aria-label="Ocultar conversaciones" />
        </div>

        <RecentChats
          activeThreadId={threadId}
          isLoading={isPending}
          threads={threads}
        />
      </aside>

      <Sheet onOpenChange={setOpenMobile} open={openMobile}>
        <SheetContent side="left">
          <SheetHeader>
            <SheetTitle>Conversaciones</SheetTitle>
          </SheetHeader>
          <RecentChats
            activeThreadId={threadId}
            isLoading={isPending}
            onSelect={() => setOpenMobile(false)}
            threads={threads}
          />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-1 border-b px-2">
          <Button
            aria-label="Mostrar conversaciones"
            className="md:hidden"
            onClick={() => setOpenMobile(true)}
            size="icon-sm"
            variant="ghost"
          >
            <ListIcon className="size-4" />
          </Button>
          <SidebarTrigger
            aria-label={
              open ? "Ocultar conversaciones" : "Mostrar conversaciones"
            }
            className="hidden md:inline-flex"
          />
          <span className="font-semibold">Pana</span>
          <Button
            aria-label="Nuevo chat"
            className="ml-auto"
            nativeButton={false}
            render={<Link to="/chat" viewTransition={chatViewTransition} />}
            size="icon-sm"
            variant="ghost"
          >
            <NotePencilIcon className="size-4" />
          </Button>
        </header>

        <Outlet />
      </div>
    </BorderContainer>
  );
}
