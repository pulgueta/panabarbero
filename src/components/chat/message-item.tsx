import type { UIMessage } from "@convex-dev/agent";
import { useSmoothText } from "@convex-dev/agent/react";
import type { ToolUIPart } from "ai";
import type { ReactNode } from "react";
import { memo, useMemo } from "react";

import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ui/ai/message";
import { Shimmer } from "@/components/ui/ai/shimmer";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ui/ai/tool";
import type { Proposal } from "./proposal-card";
import { ProposalCard, proposalSchema } from "./proposal-card";

const THINKING_PHRASES = [
  "Pensando…",
  "Trabajando…",
  "Un momento…",
  "Dándole vueltas…",
  "Revisando opciones…",
  "Consultando datos…",
  "Preparando la respuesta…",
] as const;

function pickThinkingPhrase(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i);
  }
  const idx = Math.abs(h) % THINKING_PHRASES.length;
  return THINKING_PHRASES[idx] ?? THINKING_PHRASES[0];
}

interface MessageItemProps {
  message: UIMessage;
  isStreaming?: boolean;
  /**
   * Whether this is the last message in the thread. A proposal card only shows
   * its buttons while it's the last message — once any message follows it (the
   * confirmation, rejection, or a new turn), the decision is already made.
   */
  isLastMessage: boolean;
  onConfirm: (proposal: Proposal) => Promise<void>;
  onReject: () => Promise<void>;
}

const MessageTextPart = memo(function MessageTextPart({
  text,
  useSmoothStreaming,
}: {
  text: string;
  useSmoothStreaming: boolean;
}) {
  const [visible] = useSmoothText(text, {
    startStreaming: useSmoothStreaming,
    charsPerSec: 384,
  });

  return (
    <MessageResponse isAnimating={useSmoothStreaming}>
      {visible}
    </MessageResponse>
  );
});

const ThinkingShimmer = memo(function ThinkingShimmer({
  phraseSeed,
}: {
  phraseSeed: string;
}) {
  const phrase = useMemo(() => pickThinkingPhrase(phraseSeed), [phraseSeed]);

  return (
    <p className="text-muted-foreground text-sm">
      <Shimmer as="span" className="font-medium">
        {phrase}
      </Shimmer>
    </p>
  );
});

function extractProposal(part: ToolUIPart): Proposal | null {
  if (part.state !== "output-available") return null;
  const parsed = proposalSchema.safeParse(part.output);
  return parsed.success ? parsed.data : null;
}

function ToolOutputContent({ part }: { part: ToolUIPart }): ReactNode {
  if (part.state !== "output-available") return null;
  if (typeof part.output === "string") return part.output;
  return (
    <pre className="overflow-x-auto whitespace-pre-wrap rounded bg-muted p-2 text-xs">
      {JSON.stringify(part.output, null, 2)}
    </pre>
  );
}

export function MessageItem({
  message,
  isStreaming = false,
  isLastMessage,
  onConfirm,
  onReject,
}: MessageItemProps) {
  const smoothAssistantText =
    message.role === "assistant" && Boolean(isStreaming);

  return (
    <Message from={message.role}>
      <MessageContent>
        {message.parts.map((part, index) => {
          const key = `${message.key}-${index}`;

          if (part.type === "text") {
            const textKey =
              message.role === "assistant" ? `${key}-${message.status}` : key;
            return (
              <MessageTextPart
                key={textKey}
                text={part.text}
                useSmoothStreaming={smoothAssistantText}
              />
            );
          }

          if (part.type === "reasoning") {
            if (!isStreaming) return null;
            return <ThinkingShimmer key={key} phraseSeed={key} />;
          }

          const isToolPart =
            part.type === "dynamic-tool" ||
            (typeof part.type === "string" && part.type.startsWith("tool-"));

          if (isToolPart) {
            const toolPart = part as ToolUIPart;
            const proposal = extractProposal(toolPart);
            const isDev = import.meta.env.DEV;

            return (
              <div className="flex flex-col gap-2" key={key}>
                {isDev ? (
                  <Tool defaultOpen={false}>
                    <ToolHeader
                      state={toolPart.state}
                      type={toolPart.type as `tool-${string}`}
                    />
                    <ToolContent>
                      <ToolInput input={toolPart.input} />
                      <ToolOutput
                        errorText={toolPart.errorText}
                        output={<ToolOutputContent part={toolPart} />}
                      />
                    </ToolContent>
                  </Tool>
                ) : (
                  <ToolHeader
                    state={toolPart.state}
                    type={toolPart.type as `tool-${string}`}
                  />
                )}
                {proposal && (
                  <ProposalCard
                    isActive={isLastMessage}
                    onConfirm={onConfirm}
                    onReject={onReject}
                    proposal={proposal}
                  />
                )}
              </div>
            );
          }

          return null;
        })}
      </MessageContent>
    </Message>
  );
}
