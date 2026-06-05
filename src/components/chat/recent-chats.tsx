import { ChatCircleIcon, NotePencilIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";

import { Skeleton } from "@/components/ui/skeleton";
import { chatViewTransition } from "@/lib/chat-view-transition";
import { buttonVariants } from "../ui/button";

export interface ChatThreadSummary {
  _id: string;
  title?: string;
  _creationTime: number;
}

interface RecentChatsProps {
  threads: ChatThreadSummary[];
  activeThreadId: string | undefined;
  isLoading: boolean;
  /** Called after navigating — used to close the mobile drawer. */
  onSelect?: () => void;
}

/**
 * Recent-conversations list shared by the desktop sidebar and the mobile
 * drawer. Each thread links to `/chat/$threadId` with the directional chat
 * view transition; the "Nuevo chat" link returns to the empty `/chat` view.
 */
export function RecentChats({
  threads,
  activeThreadId,
  isLoading,
  onSelect,
}: RecentChatsProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="p-2">
        <Link
          className={buttonVariants({
            className: "w-full justify-start",
          })}
          onClick={onSelect}
          to="/chat"
          viewTransition={chatViewTransition}
        >
          <NotePencilIcon className="size-4 shrink-0" weight="bold" />
          Nuevo chat
        </Link>
      </div>

      <nav
        aria-label="Conversaciones recientes"
        className="scrollbar-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
      >
        {isLoading ? (
          <RecentChatsSkeleton />
        ) : threads.length === 0 ? (
          <p className="px-2.5 py-6 text-center text-muted-foreground text-sm">
            Aún no tienes conversaciones con Pana.
          </p>
        ) : (
          threads.map((thread) => {
            const isActive = thread._id === activeThreadId;

            return (
              <Link
                aria-current={isActive ? "page" : undefined}
                className={buttonVariants({
                  className: "w-full justify-start",
                  variant: isActive ? "outline" : "ghost",
                })}
                key={thread._id}
                onClick={onSelect}
                params={{ threadId: thread._id }}
                to="/chat/$threadId"
                viewTransition={chatViewTransition}
              >
                <ChatCircleIcon
                  className="size-4 shrink-0"
                  weight={isActive ? "fill" : "regular"}
                />
                {thread.title ? (
                  <span className="truncate">{thread.title}</span>
                ) : (
                  // Title is generated in the background right after the thread
                  // is created — show a skeleton until it lands.
                  <Skeleton className="h-4 w-32 max-w-full" />
                )}
              </Link>
            );
          })
        )}
      </nav>
    </div>
  );
}

const SKELETON_ROWS = ["a", "b", "c", "d", "e", "f"];

function RecentChatsSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {SKELETON_ROWS.map((row) => (
        <Skeleton className="h-9 w-full rounded-lg" key={row} />
      ))}
    </div>
  );
}
