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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, handleFormSubmit } from "@/lib/form-utils";
import { type ServiceFormData, serviceFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface ServiceFormProps {
  onSuccess?: () => void;
  initialData?: Partial<ServiceFormData>;
  mode?: "create" | "edit";
  barbershopId?: string;
}

export function ServiceForm({
  onSuccess,
  initialData,
  mode = "create",
  barbershopId,
}: ServiceFormProps) {
  // Mock data for barbershops - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      price: initialData?.price || 0,
      duration: initialData?.duration || undefined,
      barbershopId: barbershopId || initialData?.barbershopId || "",
    },
  });

  function onSubmit(data: ServiceFormData) {
    handleFormSubmit(data);
    toast.success(
      mode === "create"
        ? "Servicio creado exitosamente"
        : "Servicio actualizado exitosamente",
    );

    onSuccess?.();
  }

  const watchedPrice = form.watch("price");
  const watchedDuration = form.watch("duration");

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
                      <SelectValue placeholder="Seleccione una barbería" />
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del Servicio *</FormLabel>
              <FormControl>
                <Input placeholder="Ej: Corte de cabello clásico" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe el servicio en detalle..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio (COP) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30000"
                    min="0"
                    {...field}
                    onChange={(e) =>
                      field.onChange(parseInt(e.target.value, 10) || 0)
                    }
                  />
                </FormControl>
                {watchedPrice > 0 && (
                  <FormDescription>
                    {formatCurrency(watchedPrice)}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="duration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Duración (minutos)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="30"
                    min="5"
                    max="480"
                    {...field}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          ? parseInt(e.target.value, 10)
                          : undefined,
                      )
                    }
                  />
                </FormControl>
                {watchedDuration && (
                  <FormDescription>
                    {watchedDuration < 60
                      ? `${watchedDuration} minutos`
                      : `${Math.floor(watchedDuration / 60)} hora${Math.floor(watchedDuration / 60) > 1 ? "s" : ""} ${watchedDuration % 60 > 0 ? `${watchedDuration % 60} minutos` : ""}`}
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end gap-4">
          <Button type="submit">
            {mode === "create" ? "Crear Servicio" : "Actualizar Servicio"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
