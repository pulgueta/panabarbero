import type { AnyFormApi } from "@tanstack/react-form";
import { useCallback, useState } from "react";
import type { ZodObject } from "zod";

interface UseFormStepperOptions {
  /**
   * Allow jumping to ANY step from the indicator. Meant for edit flows whose
   * step schemas are all-optional (updateSchema slices); create flows leave
   * this off so moving forward always goes through the validating "next".
   */
  freeNavigation?: boolean;
}

/**
 * Multi-step form navigation driven by one zod schema per step, adapted from
 * the TanCN form-registry survey example (https://tancn.dev/form-registry).
 * The current step's schema feeds the form's `onDynamic` validator; advancing
 * safe-parses the values first, so an invalid step paints its field errors
 * (via `handleSubmit`, which the failing validator blocks) instead of moving.
 */
export function useFormStepper(
  schemas: ZodObject[],
  { freeNavigation = false }: UseFormStepperOptions = {},
) {
  const stepCount = schemas.length;
  const [currentStep, setCurrentStep] = useState(1);

  const goToPrevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  const canGoToStep = useCallback(
    (step: number) => freeNavigation || step <= currentStep,
    [freeNavigation, currentStep],
  );

  const goToStep = useCallback(
    (step: number) => {
      const target = Math.min(Math.max(step, 1), stepCount);

      if (freeNavigation || target <= currentStep) {
        setCurrentStep(target);
      }
    },
    [freeNavigation, stepCount, currentStep],
  );

  const currentValidator = schemas[currentStep - 1];

  const handleNextStepOrSubmit = useCallback(
    async (form: AnyFormApi) => {
      const result = currentValidator.safeParse(form.state.values);

      if (!result.success) {
        // Blocked by the same schema wired as `onDynamic` — this surfaces the
        // step's field errors without ever reaching `onSubmit`.
        await form.handleSubmit();
        return;
      }

      if (currentStep < stepCount) {
        setCurrentStep(currentStep + 1);
        return;
      }

      await form.handleSubmit();
    },
    [currentValidator, currentStep, stepCount],
  );

  return {
    currentStep,
    stepCount,
    isFirstStep: currentStep === 1,
    isLastStep: currentStep === stepCount,
    /** Wire as the form's `onDynamic` validator. */
    currentValidator,
    canGoToStep,
    goToStep,
    goToPrevStep,
    handleNextStepOrSubmit,
  };
}

export type FormStepperApi = ReturnType<typeof useFormStepper>;
