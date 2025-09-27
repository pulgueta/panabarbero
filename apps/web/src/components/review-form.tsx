import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { handleFormSubmit } from "@/lib/form-utils";
import { type ReviewFormData, reviewFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ReviewFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ReviewFormData>;
  mode?: "create" | "edit";
  barbershopId?: string;
}

const ratingOptions = [
  {
    value: 5,
    label: "⭐⭐⭐⭐⭐ Excelente",
    description: "Superó mis expectativas",
  },
  {
    value: 4,
    label: "⭐⭐⭐⭐ Muy Bueno",
    description: "Muy satisfecho con el servicio",
  },
  { value: 3, label: "⭐⭐⭐ Bueno", description: "Servicio aceptable" },
  { value: 2, label: "⭐⭐ Regular", description: "Podría mejorar" },
  { value: 1, label: "⭐ Malo", description: "No recomendaría este lugar" },
];

export function ReviewForm({
  onSuccess,
  initialData,
  mode = "create",
  barbershopId,
}: ReviewFormProps) {
  // Mock data - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  const form = useForm<ReviewFormData>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      barbershopId: barbershopId || initialData?.barbershopId || "",
      rating: initialData?.rating || 5,
      comment: initialData?.comment || "",
      customerName: initialData?.customerName || "",
    },
  });

  const watchedRating = form.watch("rating");
  const watchedBarbershopId = form.watch("barbershopId");
  const watchedComment = form.watch("comment");
  const watchedCustomerName = form.watch("customerName");

  function onSubmit(data: ReviewFormData) {
    handleFormSubmit(data);
    toast.success(
      mode === "create"
        ? "¡Gracias por su reseña! Ha sido publicada exitosamente"
        : "Reseña actualizada exitosamente",
    );

    onSuccess?.();
  }

  function getRatingStars(value: number) {
    return "⭐".repeat(value) + "☆".repeat(5 - value);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!barbershopId && (
          <FormField
            control={form.control}
            name="barbershopId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barbería *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione la barbería a calificar" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {barbershops.map((barbershop) => (
                      <SelectItem key={barbershop.id} value={barbershop.id}>
                        {barbershop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="customerName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Su Nombre (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Juan Pérez" {...field} />
              </FormControl>
              <FormDescription>
                Si no proporciona su nombre, la reseña será anónima
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rating"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Calificación *</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(parseInt(value, 10))}
                  defaultValue={field.value.toString()}
                  className="space-y-3"
                >
                  {ratingOptions.map((option) => (
                    <div
                      key={option.value}
                      className="flex cursor-pointer items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <RadioGroupItem
                        value={option.value.toString()}
                        id={`rating-${option.value}`}
                      />
                      <div className="flex-1">
                        <FormLabel
                          htmlFor={`rating-${option.value}`}
                          className="cursor-pointer font-medium"
                        >
                          {option.label}
                        </FormLabel>
                        <p className="mt-1 text-muted-foreground text-sm">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
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
              <FormLabel>Comentario (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Cuéntenos sobre su experiencia... ¿Qué le gustó? ¿Qué podría mejorar?"
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Su opinión es muy importante para nosotros y ayuda a otros
                clientes
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedBarbershopId && (
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="mb-2 font-medium text-sm">
              Vista Previa de su Reseña:
            </p>
            <div className="space-y-2">
              <p className="text-lg">{getRatingStars(watchedRating)}</p>
              <p className="font-medium">
                {watchedCustomerName || "Cliente Anónimo"}
              </p>
              {watchedComment && (
                <p className="text-muted-foreground text-sm italic">
                  "{watchedComment}"
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button type="submit">
            {mode === "create" ? "Publicar Reseña" : "Actualizar Reseña"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
