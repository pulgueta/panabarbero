import { useChat } from "@ai-sdk/react";
import {
  ArrowCounterClockwiseIcon,
  CheckCircleIcon,
  ClockIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import { createChat } from "@shadcn/helpers/ai-sdk";
import type { ToolUIPart, UIMessage } from "ai";
import { useInView } from "motion/react";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ui/ai/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ui/ai/prompt-input";
import { Shimmer } from "@/components/ui/ai/shimmer";
import { Suggestion, Suggestions } from "@/components/ui/ai/suggestion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import { getToolDisplayName } from "@/lib/tool-names";

/**
 * Scripted questions Pana answers in the demo. The answers reuse the exact
 * data of the landing simulation (Barbería El Pana) and only claim what the
 * real agent can do: agenda, equipo y servicios; never inventario ni caja.
 */
const TOPICS = [
  "¿Cómo va mi día?",
  "¿Cómo va la ocupación del equipo?",
  "Crea una cita para Felipe",
] as const;

const messageText = (message: UIMessage): string =>
  message.parts
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("");

/**
 * Offline chat: `createChat` has no predefined turns, so every send hits the
 * `fallback` writer, which scripts the answer for whichever question arrives.
 * This keeps the chips order-independent and lets visitors type freely while
 * still streaming through the real `useChat` lifecycle.
 */
const chat = createChat();

const transport = chat.transport({
  delayMs: 28,
  fallback: ({ writer, messages }) => {
    const question = messageText(messages.at(-1) as UIMessage).toLowerCase();

    if (question.includes("día") || question.includes("dia")) {
      writer
        .tool("getAvailability", { input: { fecha: "hoy" } })
        .sleep(650)
        .output({ citas: 12, sinConfirmar: 2, proximoHueco: "4:00 p. m." });
      writer.sleep(250);
      writer.text(
        "Tienes 12 citas hoy y 2 sin confirmar. Camilo está libre a las 4:00 p. m., por si quieres meter una más.",
      );
      return;
    }

    if (question.includes("equipo") || question.includes("ocupación")) {
      writer
        .tool("getBarbershopTeam", { input: { barbería: "Barbería El Pana" } })
        .sleep(650)
        .output({ Camilo: "60%", Valentina: "52%", Sebastián: "44%" });
      writer.sleep(250);
      writer.text(
        "Camilo va en 60%, Valentina en 52% y Sebastián en 44%. Queda espacio en la tarde.",
      );
      return;
    }

    if (question.includes("cita") || question.includes("crea")) {
      writer
        .tool("proposeBooking", {
          input: { cliente: "Felipe Lara", servicio: "Corte clásico" },
        })
        .sleep(700)
        .output({ barbero: "Valentina", hora: "hoy 12:45", precio: "$25.000" });
      writer.sleep(250);
      writer.text(
        "Listo: corte clásico con Valentina, hoy a las 12:45. Le envié la confirmación por SMS.",
      );
      return;
    }

    writer.sleep(400);
    writer.text(
      "Buena pregunta. En tu dashboard te la respondo con los datos reales de tu barbería: agenda, equipo y servicios. Crea tu cuenta y me pones a prueba.",
    );
  },
});

const initialMessages = chat.get(0);

const toolStatus = {
  running: {
    label: "Ejecutando",
    variant: "warning",
    icon: <ClockIcon aria-hidden className="size-3 animate-pulse" />,
  },
  done: {
    label: "Completado",
    variant: "success",
    icon: <CheckCircleIcon aria-hidden className="size-3" />,
  },
} as const;

/** Compact tool chip matching the production `ToolHeader` look. */
const ToolChip = ({ part }: { part: ToolUIPart }) => {
  const name = part.type.replace(/^tool-/, "");
  const status =
    part.state === "output-available" ? toolStatus.done : toolStatus.running;

  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <WrenchIcon aria-hidden className="size-4 shrink-0" weight="bold" />
      <span className="font-medium">{getToolDisplayName(name)}</span>
      <Badge className="gap-1 rounded-full text-xs" variant={status.variant}>
        {status.icon}
        {status.label}
      </Badge>
    </div>
  );
};

/**
 * Live, interactive Pana demo for the `/ai` page. Everything runs offline
 * through `@shadcn/helpers/ai-sdk`, but streams through the real `useChat`
 * lifecycle, so it behaves exactly like the production chat.
 */
export function PanaLiveChat() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const autoPlayed = useRef(false);
  const [text, setText] = useState("");

  const { messages, sendMessage, status, setMessages } = useChat({
    messages: initialMessages,
    transport,
  });

  const isBusy = status === "submitted" || status === "streaming";
  const asked = new Set(
    messages.filter((m) => m.role === "user").map(messageText),
  );

  const ask = useCallback(
    (question: string) => {
      void sendMessage({ text: question });
    },
    [sendMessage],
  );

  useEffect(() => {
    if (isInView && !autoPlayed.current) {
      autoPlayed.current = true;
      ask(TOPICS[0]);
    }
  }, [isInView, ask]);

  const handleSubmit = (
    message: { text: string },
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault?.();
    const value = message.text.trim();
    if (!value || isBusy) return;
    setText("");
    ask(value);
  };

  return (
    <div
      ref={ref}
      className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-black/5 shadow-xl"
    >
      <div className="flex items-center gap-2.5 border-b bg-background/40 px-4 py-3">
        <Avatar className="size-8">
          <AvatarFallback className="bg-primary/10 font-semibold text-primary text-xs">
            PA
          </AvatarFallback>
        </Avatar>
        <span className="font-semibold text-sm">Pana</span>
        <div className="ml-auto flex items-center gap-1.5">
          {messages.length > 0 && !isBusy && (
            <Button
              aria-label="Reiniciar conversación"
              onClick={() => setMessages(initialMessages)}
              size="icon"
              variant="ghost"
            >
              <ArrowCounterClockwiseIcon className="size-4" weight="bold" />
            </Button>
          )}
          <Badge variant="success">En línea</Badge>
        </div>
      </div>

      <MessageScrollerProvider autoScroll>
        <MessageScroller className="h-80">
          <MessageScrollerViewport>
            <MessageScrollerContent
              aria-busy={isBusy}
              aria-label="Conversación de demostración con Pana"
              className="gap-4 p-4"
            >
              {messages.length === 0 && (
                <p className="m-auto max-w-55 text-pretty text-center text-muted-foreground text-sm">
                  Pregúntale a Pana cómo va tu día, tu equipo o pídele una cita.
                </p>
              )}
              {messages.map((message) => (
                <MessageScrollerItem key={message.id}>
                  <Message from={message.role}>
                    <MessageContent>
                      {message.parts.map((part, index) => {
                        const key = `${message.id}-${index}`;
                        if (part.type === "text") {
                          return (
                            <MessageResponse key={key}>
                              {part.text}
                            </MessageResponse>
                          );
                        }
                        if (part.type.startsWith("tool-")) {
                          return (
                            <ToolChip key={key} part={part as ToolUIPart} />
                          );
                        }
                        return null;
                      })}
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              ))}
              {status === "submitted" && (
                <p className="text-muted-foreground text-sm">
                  <Shimmer as="span" className="font-medium">
                    Pensando…
                  </Shimmer>
                </p>
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton aria-label="Ir al final de la conversación" />
        </MessageScroller>
      </MessageScrollerProvider>

      <Suggestions className="px-4 pb-3">
        {TOPICS.map((topic) => (
          <Suggestion
            disabled={isBusy || asked.has(topic)}
            key={topic}
            onClick={ask}
            suggestion={topic}
            variant={asked.has(topic) ? "secondary" : "outline"}
          />
        ))}
      </Suggestions>

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              aria-label="Escríbele a Pana"
              onChange={(event) => setText(event.target.value)}
              placeholder="Escríbele a Pana…"
              value={text}
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit
              aria-label="Enviar mensaje"
              disabled={!text.trim() || isBusy}
              status={status}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
