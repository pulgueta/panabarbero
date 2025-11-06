import { zodResolver } from "@hookform/resolvers/zod";
import type { Barbershop, Service } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { serviceFormSchema } from "@/lib/schemas";

interface CreateServiceFormProps {
  barbershopId: Barbershop["_id"];
  onSuccess?: (service: Service) => void;
}

export const CreateServiceForm: FC<CreateServiceFormProps> = ({ barbershopId, onSuccess }) => {
  const formIds = {
    form: useId(),
    name: useId(),
    price: useId(),
    duration: useId(),
  };

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      price: undefined,
      duration: undefined,
      barbershopId,
    },
  });

  const {
    createServiceMutation: { mutateAsync: createService, isPending },
  } = useServiceActions();

  const onSubmit = form.handleSubmit(async (data) => {
    const payload = {
      uuid: crypto.randomUUID(),
      name: data.name,
      price: data.price!,
      duration: data.duration ?? 30,
      barbershopId,
    } satisfies Omit<Service, "_id" | "_creationTime">;

    await toast.promise(
      createService({ service: payload }),
      {
        loading: "Creando servicio...",
        success: "Servicio creado exitosamente.",
        error: "Error al crear el servicio.",
      },
    );

    if (onSuccess) {
      onSuccess(payload as unknown as Service);
    }
    form.reset();
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-4">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.name}>Nombre del servicio</FieldLabel>
              <Input {...field} id={formIds.name} aria-invalid={fieldState.invalid} placeholder="Corte de pelo" />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-2 gap-2">
          <Controller
            name="duration"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.duration}>Duración (minutos)</FieldLabel>
                {/* @ts-expect-error */}
                <Input {...field} id={formIds.duration} aria-invalid={fieldState.invalid} type="number" placeholder="30" className="w-full tabular-nums" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.price}>Precio</FieldLabel>
                {/* @ts-expect-error */}
                <Input {...field} id={formIds.price} aria-invalid={fieldState.invalid} type="number" placeholder="30000" className="w-full tabular-nums" />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? <Spinner /> : "Crear servicio"}
      </Button>
    </form>
  );
};


