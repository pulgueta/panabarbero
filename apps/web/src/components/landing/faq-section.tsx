import { CaretDownIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { HOME_FAQS } from "@/config/home-faqs";

export const FaqSection: FC = () => {
  return (
    <section className="mx-auto w-full max-w-2xl space-y-4">
      <h2 className="text-center font-semibold text-3xl tracking-tighter md:text-4xl">
        Preguntas frecuentes
      </h2>
      <div className="flex flex-col">
        {HOME_FAQS.map((faq) => (
          <Collapsible key={faq.question} className="border-b">
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-4 rounded-lg px-1 py-4 text-left font-medium focus-visible:ring-2 focus-visible:ring-ring/50 [&[data-panel-open]>svg]:rotate-180">
              {faq.question}
              <CaretDownIcon
                weight="bold"
                className="size-4 shrink-0 text-muted-foreground transition-transform"
              />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <p className="text-pretty px-1 pb-4 text-muted-foreground text-sm leading-relaxed">
                {faq.answer}
              </p>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </section>
  );
};
