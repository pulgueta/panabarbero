import { useConvexMutation } from "@convex-dev/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { api } from "convex/_generated/api";
import type { Id } from "convex/_generated/dataModel";
import { Minus, Plus, StarIcon } from "lucide-react";
import type { FC } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { reviewFormSchema } from "./schema";

interface ReviewFormProps {
  barbershopId: Id<"barbershops">;
  userId: string;
  formHeadLabel?: string;
}

export const ReviewForm: FC<ReviewFormProps> = ({
  formHeadLabel,
  barbershopId,
  userId,
}) => {
  const form = useForm({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      rating: 1,
      comment: "",
    },
  });

  const {
    mutateAsync: createReview,
    isPending,
    error,
    isError,
    isSuccess,
  } = useMutation({
    mutationFn: useConvexMutation(api.reviews.createReview),
  });

  if (isError) {
    toast.error(error?.message);
  }

  if (isSuccess) {
    toast.success("¡Perfecto! ¡Gracias por aportar tu opinión!");
  }

  const isSubmittingReview = form.formState.isSubmitting || isPending;

  const onSubmit = form.handleSubmit(async (data) => {
    await createReview({
      review: {
        ...data,
        uuid: crypto.randomUUID(),
        barbershopId,
        userId,
      },
    });
  });

  return (
    <div className="space-y-4">
      {formHeadLabel && (
        <h2 className="text-pretty text-center font-semibold text-lg leading-tight">
          {formHeadLabel}
        </h2>
      )}

      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-4">
          <FormField
            control={form.control}
            name="rating"
            render={({ field }) => (
              <FormItem>
                <FormControl className="flex justify-center">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        field.onChange(Math.max(1, field.value - 1))
                      }
                      type="button"
                      disabled={field.value === 1 || isSubmittingReview}
                    >
                      <Minus className="size-4" />
                    </Button>

                    <div className="inline-flex items-center gap-1.5">
                      <StarIcon className="size-4 fill-yellow-500 text-yellow-500" />
                      <span className="block text-base tabular-nums">
                        {field.value}
                      </span>
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      disabled={field.value === 5 || isSubmittingReview}
                      onClick={() =>
                        field.onChange(Math.min(5, field.value + 1))
                      }
                      type="button"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="comment"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Deja tu comentario. (opcional)"
                    className="min-h-24"
                    disabled={isSubmittingReview}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button className="w-full" disabled={isSubmittingReview}>
            {isSubmittingReview ? <Spinner /> : "Enviar calificación"}
          </Button>

          <div className="rounded-md border border-dashed p-3 text-muted-foreground text-sm">
            <p>
              Al enviar esta reseña confirmas que su contenido no podrá editarse
              durante los próximos 15 días. Queremos mantener la confianza de
              otros clientes, por lo que solo podrás actualizarla después de ese
              periodo.
            </p>
            <div className="mt-2">
              <Button variant="link">
                Conoce más en la política de reseñas
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
};
