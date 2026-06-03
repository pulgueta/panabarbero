import { CheckIcon, ScissorsIcon, SparkleIcon } from "@phosphor-icons/react";
import { domAnimation, LazyMotion, m, useInView } from "motion/react";
import { useRef } from "react";

import { Message, MessageContent } from "@/components/ui/ai/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ui/ai/prompt-input";

/** Scripted, non-interactive transcript of Pana booking a haircut. */
const SCRIPT = [
  {
    from: "user",
    text: "Quiero un corte para mañana en La Catedral Barber.",
  },
  {
    from: "assistant",
    text: "¡De una! La Catedral tiene Corte clásico ($25.000, 30 min) y Corte + barba ($40.000, 50 min). ¿Cuál quieres?",
  },
  {
    from: "user",
    text: "El clásico, a las 10:30 si se puede.",
  },
  {
    from: "assistant",
    text: "Bacano. Pa' mañana con Andrés a las 10:30 está libre. Te dejo la reserva lista 👇",
  },
] as const;

const noop = () => {};

export function PanaDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <LazyMotion features={domAnimation}>
      <m.div
        ref={ref}
        initial={{ opacity: 0, y: 24 }}
        animate={isInView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-black/5 shadow-xl"
      >
        <div className="flex items-center gap-2.5 border-b bg-background/40 px-4 py-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <SparkleIcon weight="fill" className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">Pana</span>
            <span className="text-muted-foreground text-xs leading-none">
              Asistente de PanaBarbero
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-4">
          {SCRIPT.map((line, index) => (
            <m.div
              key={line.text}
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : undefined}
              transition={{ duration: 0.4, delay: 0.2 + index * 0.18 }}
            >
              <Message from={line.from}>
                <MessageContent>{line.text}</MessageContent>
              </Message>
            </m.div>
          ))}

          <m.div
            initial={{ opacity: 0, y: 10 }}
            animate={isInView ? { opacity: 1, y: 0 } : undefined}
            transition={{ duration: 0.4, delay: 0.2 + SCRIPT.length * 0.18 }}
            className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 dark:bg-primary/10"
          >
            <div className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <ScissorsIcon className="size-4" weight="bold" />
              </span>
              <div className="flex flex-1 flex-col gap-0.5">
                <p className="font-semibold text-sm">
                  Corte clásico · La Catedral Barber
                </p>
                <p className="text-muted-foreground text-xs">
                  Mañana 10:30 a. m. · con Andrés
                </p>
              </div>
              <span className="font-semibold text-sm">$25.000</span>
            </div>
            <div
              aria-hidden="true"
              className="mt-3 flex items-center justify-end gap-2"
            >
              <span className="inline-flex h-8 items-center rounded-md border px-3 text-muted-foreground text-xs">
                Cancelar
              </span>
              <span className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 font-medium text-primary-foreground text-xs">
                <CheckIcon className="size-3.5" />
                Confirmar
              </span>
            </div>
          </m.div>
        </div>

        <div className="border-t p-3">
          <PromptInput onSubmit={noop}>
            <PromptInputBody>
              <PromptInputTextarea
                aria-label="Demostración del chat de Pana"
                disabled
                placeholder="Escríbele a Pana…"
                readOnly
                tabIndex={-1}
              />
            </PromptInputBody>
            <PromptInputFooter>
              <PromptInputTools />
              <PromptInputSubmit
                aria-hidden="true"
                disabled
                status="ready"
                tabIndex={-1}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </m.div>
    </LazyMotion>
  );
}
