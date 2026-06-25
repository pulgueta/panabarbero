import { ArrowLeftIcon } from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { StarRating } from "@/components/ui/star-rating";
import { Textarea } from "@/components/ui/textarea";
import { useReviewActions } from "@/hooks/use-reviews";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { reviewSchema } from "@/lib/schemas";

interface ReviewFormProps {
  code: string;
  barbershopUuid: string;
  serviceName?: string;
  onSuccess?: () => void;
}

export const ReviewForm: FC<ReviewFormProps> = ({
  code,
  barbershopUuid,
  serviceName,
  onSuccess,
}) => {
  const navigate = useNavigate();
  const haptic = useWebHaptics();

  const {
    createReviewMutation: { mutateAsync: createReview },
  } = useReviewActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - optional comment field is not supported by tanstack form
      onSubmit: reviewSchema,
    },
    defaultValues: {
      rating: 0,
      comment: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const result = await createReview({
          code,
          rating: value.rating,
          comment: value.comment?.trim() || undefined,
        });

        haptic.trigger("success");
        toast.success(
          result.status === "published"
            ? "¡Gracias! Tu reseña ya está publicada."
            : "¡Gracias! Tu reseña será revisada. Si todo está en orden se publicará; si encontramos lenguaje inapropiado, te avisaremos para que la edites.",
        );
        form.reset();
        onSuccess?.();
        navigate({
          to: "/barbershops/$barbershopUuid",
          params: { barbershopUuid },
        });
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
    >
      <form.AppField name="rating">
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor={field.name}>Calificación</FieldLabel>
            <StarRating
              value={field.state.value}
              onChange={(rating) => {
                haptic.trigger("light");
                field.handleChange(rating);
              }}
              starClassName="size-8"
              aria-label={
                serviceName
                  ? `Califica el servicio ${serviceName}`
                  : "Califica tu experiencia"
              }
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError
                errors={field.state.meta.errors.map((e) => ({
                  message: String(e),
                }))}
              />
            )}
          </Field>
        )}
      </form.AppField>

      <form.AppField name="comment">
        {(field) => (
          <Field data-invalid={field.state.meta.errors.length > 0}>
            <FieldLabel htmlFor={field.name}>Comentario (opcional)</FieldLabel>
            <Textarea
              id={field.name}
              name={field.name}
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={(e) => field.handleChange(e.target.value)}
              aria-invalid={field.state.meta.errors.length > 0}
              placeholder="Cuéntanos cómo te fue. ¿Qué te gustó del servicio?"
              maxLength={500}
              rows={4}
            />
            {field.state.meta.errors.length > 0 && (
              <FieldError
                errors={field.state.meta.errors.map((e) => ({
                  message: String(e),
                }))}
              />
            )}
          </Field>
        )}
      </form.AppField>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        <form.AppForm>
          <form.SubmitButton
            label="Enviar reseña"
            className="w-full sm:w-auto"
          />
        </form.AppForm>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground sm:w-auto"
          onClick={() =>
            navigate({
              to: "/barbershops/$barbershopUuid",
              params: { barbershopUuid },
            })
          }
        >
          <ArrowLeftIcon className="size-4 shrink-0" />
          Ahora no
        </Button>
      </div>
    </form>
  );
};
