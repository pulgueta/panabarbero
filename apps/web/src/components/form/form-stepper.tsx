import type { FC } from "react";
import { Fragment } from "react";

import { cn } from "@/lib/utils";

export interface FormStepperStep {
  label: string;
}

interface FormStepperProps {
  steps: FormStepperStep[];
  /** 1-based, mirroring `useFormStepper`. */
  currentStep: number;
  onSelectStep: (step: number) => void;
  canSelectStep: (step: number) => boolean;
}

/**
 * Step indicator for multi-step forms: shows where you are and jumps straight
 * to any reachable step (edit flows open every step; create flows only what
 * was already visited).
 */
export const FormStepper: FC<FormStepperProps> = ({
  steps,
  currentStep,
  onSelectStep,
  canSelectStep,
}) => (
  <nav aria-label="Pasos del formulario">
    <ol className="flex items-center gap-2">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isCurrent = stepNumber === currentStep;
        const isDone = stepNumber < currentStep;
        const selectable = !isCurrent && canSelectStep(stepNumber);

        return (
          <Fragment key={step.label}>
            {index > 0 && (
              <span aria-hidden className="h-px flex-1 bg-border" />
            )}
            <li>
              <button
                type="button"
                onClick={() => onSelectStep(stepNumber)}
                disabled={!selectable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
                  isCurrent
                    ? "border-primary bg-primary font-medium text-primary-foreground"
                    : isDone
                      ? "border-primary/40 text-foreground"
                      : "text-muted-foreground",
                  selectable && "hover:bg-accent",
                  !selectable && !isCurrent && "opacity-60",
                )}
              >
                <span className="tabular-nums">{stepNumber}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
            </li>
          </Fragment>
        );
      })}
    </ol>
  </nav>
);
