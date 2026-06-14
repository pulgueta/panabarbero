import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";

import type { Proposal } from "@/components/chat/proposal-card";
import { chatViewTransition } from "@/lib/chat-view-transition";

export function myThreadsQueryOptions(userId?: string) {
  return convexQuery(api.aiChat.listMyThreads, {
    userId,
    paginationOpts: { cursor: null, numItems: 20 },
  });
}

/**
 * Recent threads for the chat sidebar. Uses `useQuery` (not suspense) so it
 * handles the anonymous case gracefully — `userId` is `undefined` until the
 * client mounts, and the backend returns an empty page for unknown callers.
 */
export function useMyThreads(userId: string | undefined) {
  return useQuery(myThreadsQueryOptions(userId));
}

export function useChatMessages(
  threadId: string | undefined,
  userId: string | undefined,
) {
  return useUIMessages(
    api.aiChat.listMessages,
    threadId && userId ? { threadId, userId } : "skip",
    { initialNumItems: 30, stream: true },
  );
}

export function useSendChatMessage(userId: string | undefined) {
  const navigate = useNavigate();
  const createThreadAndSend = useMutation(api.aiChat.createThreadAndSend);
  const sendMessage = useMutation(api.aiChat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.aiChat.listMessages),
  );

  return useCallback(
    async (threadId: string | undefined, prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || !userId) return null;

      // First message: create the thread and send it in one round-trip, then
      // navigate. The message is already persisted, so it shows the moment the
      // thread's first page loads (no lost optimistic update across the remount).
      if (!threadId) {
        const { threadId: newId } = await createThreadAndSend({
          prompt: trimmed,
          userId,
        });
        void navigate({
          to: "/chat/$threadId",
          params: { threadId: newId },
          viewTransition: chatViewTransition,
        });
        return newId;
      }

      // Existing thread: the subscription is already live, so the optimistic
      // update inserts the user's message instantly.
      await sendMessage({ threadId, prompt: trimmed, userId });
      return threadId;
    },
    [userId, createThreadAndSend, sendMessage, navigate],
  );
}

export function useProposalActions(
  threadId: string | undefined,
  userId: string | undefined,
) {
  const confirm = useAction(api.aiChat.confirmPendingAction);
  const reject = useAction(api.aiChat.rejectPendingAction);

  return {
    confirm: useCallback(
      async (proposal: Proposal) => {
        if (!threadId || !userId) return;
        await confirm({
          threadId,
          userId,
          pending: {
            action: proposal.action,
            args: proposal.args,
          } as never,
        });
      },
      [threadId, userId, confirm],
    ),
    reject: useCallback(async () => {
      if (!threadId || !userId) return;
      await reject({ threadId, userId });
    }, [threadId, userId, reject]),
  };
}
