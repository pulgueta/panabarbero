import { ChatCircleIcon, CrownIcon } from "@phosphor-icons/react";
import { createFileRoute, Link } from "@tanstack/react-router";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { MessageItem } from "@/components/chat/message-item";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ui/ai/conversation";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ui/ai/prompt-input";
import { Suggestion, Suggestions } from "@/components/ui/ai/suggestion";
import { Button } from "@/components/ui/button";
import { useBarbershopMemberRoles } from "@/hooks/barbershop/use-barbershop-member";
import { usePlan } from "@/hooks/billing/use-plan";
import {
  myThreadsQueryOptions,
  useChatMessages,
  useProposalActions,
  useSendChatMessage,
} from "@/hooks/use-chat";
import { getSessionQueryOptions, useSession } from "@/hooks/use-session";
import { getCanonicalUrl, seo } from "@/lib/utils";

const SUGGESTIONS = [
  "¿Qué barberías hay cerca?",
  "Muéstrame mis próximas citas",
  "Quiero reservar un corte para mañana",
  "Cancelar mi próxima cita",
] as const;

const searchSchema = z.object({
  thread: z.string().optional(),
});

export const Route = createFileRoute("/chat")({
  component: ChatRoute,
  validateSearch: searchSchema,
  ssr: "data-only",
  loader: async ({ context }) => {
    const user = await context.queryClient.ensureQueryData(
      getSessionQueryOptions(),
    );

    if (user?.userId) {
      await context.queryClient.ensureQueryData(
        myThreadsQueryOptions(user.userId),
      );
    }
  },
  head: () => ({
    meta: seo({
      title: "Pana, tu asistente IA - PanaBarbero",
      description:
        "Habla con Pana para buscar barberías, ver disponibilidad y gestionar tus citas en PanaBarbero.",
      canonical: getCanonicalUrl("/chat"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/chat") }],
  }),
});

function ChatRoute() {
  const { thread: threadId } = Route.useSearch();

  const { data: user } = useSession();
  const userId = user?.userId ?? undefined;

  const { canUsePanaManagement, isLoading: planLoading } = usePlan();
  const { data: rolesData } = useBarbershopMemberRoles(userId ?? "");
  const isShopMember = Boolean(rolesData?.roles && rolesData.roles.length > 0);
  const showManagementUpsell =
    isShopMember && !planLoading && !canUsePanaManagement;

  const { results, status, loadMore } = useChatMessages(threadId, userId);
  const send = useSendChatMessage(userId);
  const { confirm: handleConfirm, reject: handleReject } = useProposalActions(
    threadId,
    userId,
  );

  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);

  const assistantStreaming = useMemo(
    () =>
      results.some((m) => m.role === "assistant" && m.status === "streaming"),
    [results],
  );

  const inputBusy = isSending || assistantStreaming;

  const submitStatus = useMemo<
    "submitted" | "streaming" | "ready" | "error"
  >(() => {
    if (assistantStreaming) return "streaming";
    if (isSending) return "submitted";
    return "ready";
  }, [assistantStreaming, isSending]);

  const handleSendPrompt = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed || inputBusy || !userId) return;

      setIsSending(true);
      try {
        await send(threadId, trimmed);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo enviar el mensaje.",
        );
      } finally {
        setIsSending(false);
      }
    },
    [userId, inputBusy, send, threadId],
  );

  const handleFormSubmit = useCallback(
    (message: { text: string }, event: FormEvent<HTMLFormElement>): void => {
      event.preventDefault?.();
      const value = message.text;
      setText("");
      void handleSendPrompt(value);
    },
    [handleSendPrompt],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => void handleSendPrompt(suggestion),
    [handleSendPrompt],
  );

  const handleTextChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => {
      setText(event.target.value);
    },
    [],
  );

  const handleLoadMore = useCallback(() => loadMore(20), [loadMore]);

  const handleConfirmWithToast = useCallback(
    async (proposal: Parameters<typeof handleConfirm>[0]) => {
      try {
        await handleConfirm(proposal);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "No se pudo completar la acción.",
        );
      }
    },
    [handleConfirm],
  );

  return (
    <div className="relative mx-auto flex h-[calc(100dvh-3.5rem-4rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col md:h-[calc(100dvh-4rem)]">
      {showManagementUpsell && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 dark:bg-primary/10">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CrownIcon className="size-4" weight="fill" />
          </span>
          <div className="flex-1">
            <p className="font-medium text-sm">Gestiona tu barbería con Pana</p>
            <p className="text-muted-foreground text-xs">
              Reservar siempre es gratis. Para administrar tu negocio por chat,
              activa un plan pago.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={<Link to="/pricing" />}
            size="sm"
          >
            Ver planes
          </Button>
        </div>
      )}

      <Conversation>
        <ConversationContent>
          {results.length === 0 ? (
            <ConversationEmptyState
              description="Pregúntame por barberías cercanas, disponibilidad o gestiona tus citas."
              icon={
                <ChatCircleIcon
                  aria-hidden="true"
                  className="size-8"
                  weight="bold"
                />
              }
              title="¿En qué te ayudo?"
            />
          ) : (
            results.map((message) => (
              <MessageItem
                isStreaming={
                  message.role === "assistant" && message.status === "streaming"
                }
                key={message.key}
                message={message}
                onConfirm={handleConfirmWithToast}
                onReject={handleReject}
              />
            ))
          )}
          {status === "CanLoadMore" && (
            <div className="flex justify-center pb-2">
              <Button onClick={handleLoadMore} size="sm" variant="ghost">
                Cargar mensajes anteriores
              </Button>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="grid shrink-0 gap-3 border-t pt-3">
        {!threadId && (
          <Suggestions className="px-4">
            {SUGGESTIONS.map((suggestion) => (
              <Suggestion
                key={suggestion}
                onClick={handleSuggestionClick}
                suggestion={suggestion}
              />
            ))}
          </Suggestions>
        )}

        <div className="w-full px-4 pb-4">
          <PromptInput onSubmit={handleFormSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                aria-label="Escríbele a Pana"
                onChange={handleTextChange}
                placeholder="Escríbele a Pana…"
                value={text}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                aria-label="Enviar mensaje"
                disabled={!text.trim() || inputBusy}
                status={submitStatus}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
