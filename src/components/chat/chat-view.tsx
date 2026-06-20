import { ChatCircleIcon, CrownIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

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
import { usePanaAccess } from "@/hooks/billing/use-pana-access";
import { useAnonId } from "@/hooks/use-anon-id";
import {
  useChatMessages,
  useProposalActions,
  useSendChatMessage,
} from "@/hooks/use-chat";
import { useSession } from "@/hooks/use-session";

const SUGGESTIONS = [
  "¿Qué barberías hay cerca?",
  "Muéstrame mis próximas citas",
  "Quiero reservar un corte para mañana",
  "Cancelar mi próxima cita",
] as const;

interface ChatViewProps {
  /** Active thread. Omitted on the empty `/chat` view. */
  threadId?: string;
}

/**
 * Conversation pane + composer shared by the empty `/chat` view and the
 * `/chat/$threadId` thread view. The scrollable conversation is named
 * `main-content` so it slides during chat navigations, while the composer is
 * isolated (`chat-composer`) so it stays put across the transition.
 */
export function ChatView({ threadId }: ChatViewProps) {
  const { data: user } = useSession();
  const anonId = useAnonId();
  // Authenticated users use their real id; everyone else gets an anonymous
  // session id so they can still chat (under the anonymous rate limit).
  const userId = user?.id ?? anonId;

  const { data: access } = usePanaAccess();
  // Shop members on a free-plan barbershop can't use Pana — customers can.
  const blocked = Boolean(access?.isShopMember && !access.canManage);

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
      if (!trimmed || inputBusy || !userId || blocked) return;

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
    [userId, inputBusy, send, threadId, blocked],
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
        // Re-throw so the card resets its in-flight state and keeps the buttons.
        throw error;
      }
    },
    [handleConfirm],
  );

  const handleRejectWithToast = useCallback(async () => {
    try {
      await handleReject();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo cancelar la acción.",
      );
      throw error;
    }
  }, [handleReject]);

  const lastMessageKey = results.at(-1)?.key;

  return (
    <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col">
      {blocked && (
        <div className="mx-4 mt-4 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3 dark:bg-primary/10">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <CrownIcon className="size-4" weight="fill" />
          </span>
          <div className="flex-1">
            <p className="font-medium text-sm">
              Pana es un beneficio de los planes pagos
            </p>
            <p className="text-muted-foreground text-xs">
              Tu barbería está en el plan gratuito. Activa un plan pago para
              conversar con Pana y gestionar tu negocio por chat.
            </p>
          </div>
          <Button
            nativeButton={false}
            render={
              access?.isOwner ? (
                <Link search={{ tab: "plans" }} to="/profile" />
              ) : (
                <Link to="/pricing" />
              )
            }
            size="sm"
          >
            Ver planes
          </Button>
        </div>
      )}

      <div
        className="flex min-h-0 flex-1 flex-col"
        style={{ viewTransitionName: "main-content" }}
      >
        <Conversation>
          <ConversationContent>
            {results.length ? (
              results.map((message) => (
                <MessageItem
                  isLastMessage={message.key === lastMessageKey}
                  isStreaming={
                    message.role === "assistant" &&
                    message.status === "streaming"
                  }
                  key={message.key}
                  message={message}
                  onConfirm={handleConfirmWithToast}
                  onReject={handleRejectWithToast}
                />
              ))
            ) : (
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
      </div>

      <div className="grid shrink-0 gap-3 border-t pt-3">
        {!threadId && !blocked && (
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

        <div
          className="w-full px-4 pb-4"
          style={{ viewTransitionName: "chat-composer" }}
        >
          <PromptInput onSubmit={handleFormSubmit}>
            <PromptInputBody>
              <PromptInputTextarea
                aria-label="Escríbele a Pana"
                disabled={blocked}
                onChange={handleTextChange}
                placeholder={
                  blocked
                    ? "Activa un plan pago para usar a Pana…"
                    : "Escríbele a Pana…"
                }
                value={text}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                aria-label="Enviar mensaje"
                disabled={!text.trim() || inputBusy || blocked}
                status={submitStatus}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
