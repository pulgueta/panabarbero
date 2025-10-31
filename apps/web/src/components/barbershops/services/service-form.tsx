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
import { Item, ItemContent, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { serviceFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "@panabarbero/convex/schemas";
import { Info } from "lucide-react";
import { type FC, useEffect, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

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
    updateServiceMutation: {
      mutateAsync: updateService,
      isPending,
      error,
      isError,
      isSuccess,
    },
    deleteServiceMutation: {
      mutateAsync: deleteService,
      isPending: isDeleting,
      error: deleteError,
      isError: isDeleteError,
      isSuccess: isDeleteSuccess,
    },
  } = useServiceActions();

  const handleDelete = async () => {
    await deleteService({
      serviceId: service._id,
      barbershopId: service.barbershopId,
    });
  };

  const onSubmit = form.handleSubmit(async (data) => {
    await updateService({
      serviceId: service._id,
      service: data,
    });
  });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Servicio actualizado exitosamente");
      form.reset();
    }

    if (isDeleteSuccess) {
      toast.success("Servicio eliminado exitosamente");
      form.reset();
    }

    if (isDeleteError) {
      toast.error(deleteError?.message);
    }

    if (isError) {
      toast.error(error?.message);
    }
  }, [
    isSuccess,
    isError,
    error?.message,
    form.reset,
    isDeleteSuccess,
    isDeleteError,
    deleteError?.message,
  ]);

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

      {isSuccess && (
        <Item variant="outline" asChild>
          <div className="mt-4">
            <ItemMedia>
              <Info className="size-4" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                Cierra este formulario para volver a editar el servicio
              </ItemTitle>
            </ItemContent>
          </div>
        </Item>
      )}

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
