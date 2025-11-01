import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { serviceFormSchema } from "@/lib/schemas";

interface ServiceFormProps {
  service: Service;
}

export const ServiceForm: FC<ServiceFormProps> = ({ service }) => {
  const formIds = {
    form: useId(),
    name: useId(),
    price: useId(),
    duration: useId(),
    barbershopId: useId(),
  };

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: service.name ?? "",
      price: service.price ?? undefined,
      duration: service.duration ?? undefined,
      barbershopId: service.barbershopId,
    },
  });

  const {
    updateServiceMutation: { mutateAsync: updateService, isPending, isSuccess },
    deleteServiceMutation: {
      mutateAsync: deleteService,
      isPending: isDeleting,
    },
  } = useServiceActions();

  const handleDelete = async () => {
    await deleteService({
      serviceId: service._id,
      barbershopId: service.barbershopId,
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    toast.promise(
      updateService({
        serviceId: service._id,
        service: data,
      }),
      {
        loading: "Guardando cambios...",
        success: () => {
          form.reset();

          return {
            message: "Servicio actualizado exitosamente.",
            description:
              "Cierra este formulario para volver a editar el servicio.",
          };
        },
        error: (error) => {
          return {
            message: "Error al actualizar el servicio.",
            description: error.message,
          };
        },
      },
    );
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.name}>
                Nombre del servicio
              </FieldLabel>
              <Input
                {...field}
                id={formIds.name}
                aria-invalid={fieldState.invalid}
                placeholder="Corte de pelo"
              />
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
                <FieldLabel htmlFor={formIds.duration}>
                  Duración (minutos)
                </FieldLabel>
                {/* @ts-expect-error */}
                <Input
                  {...field}
                  id={formIds.duration}
                  aria-invalid={fieldState.invalid}
                  placeholder="30"
                  type="number"
                  className="w-full tabular-nums"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="price"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.price}>Precio</FieldLabel>
                <InputGroup>
                  <InputGroupAddon>
                    <InputGroupText>$</InputGroupText>
                  </InputGroupAddon>
                  {/* @ts-expect-error */}
                  <InputGroupInput
                    {...field}
                    id={formIds.price}
                    aria-invalid={fieldState.invalid}
                    placeholder="30000"
                    type="number"
                    className="tabular-nums"
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>COP</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <div className="mt-4 flex flex-row gap-2">
        <ConfirmationDialog
          trigger={
            <Button type="button" variant="destructive" className="w-1/2">
              Eliminar
            </Button>
          }
          title="Eliminar servicio"
          description="¿Estás seguro que desea eliminar el servicio? Esta acción no se puede deshacer."
          confirmLabel={
            <Button type="button" variant="destructive" onClick={handleDelete}>
              {isDeleting ? <Spinner /> : "Sí, eliminar"}
            </Button>
          }
          cancelLabel={
            <Button type="button" variant="outline">
              No, cancelar
            </Button>
          }
        />

        <Button
          type="submit"
          disabled={isPending || isSuccess}
          className="w-1/2"
        >
          {isPending ? <Spinner /> : "Guardar"}
        </Button>
      </div>
    </form>
  );
};
