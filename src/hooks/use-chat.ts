import {
  optimisticallySendMessage,
  useUIMessages,
} from "@convex-dev/agent/react";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { useCallback } from "react";

import type { Proposal } from "@/components/chat/proposal-card";

export function myThreadsQueryOptions(userId?: string) {
  return convexQuery(api.aiChat.listMyThreads, {
    userId,
    paginationOpts: { cursor: null, numItems: 20 },
  });
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
  const createThread = useMutation(api.aiChat.createNewThread);
  const sendMessage = useMutation(api.aiChat.sendMessage).withOptimisticUpdate(
    optimisticallySendMessage(api.aiChat.listMessages),
  );

  return useCallback(
    async (threadId: string | undefined, prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || !userId) return null;

      let tid = threadId;
      if (!tid) {
        const { threadId: newId } = await createThread({ userId });
        tid = newId;
        void navigate({
          to: "/chat",
          search: { thread: newId },
          replace: true,
        });
      }

      await sendMessage({ threadId: tid, prompt: trimmed, userId });
      return tid;
    },
    [userId, createThread, sendMessage, navigate],
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
          pending: { action: proposal.action, args: proposal.args as never },
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
