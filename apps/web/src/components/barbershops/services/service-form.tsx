import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { serviceFormSchema } from "@/lib/schemas";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "@panabarbero/convex/schemas";
import { SaveIcon, TrashIcon } from "lucide-react";
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

        <Controller
          name="duration"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.duration}>
                Duración del servicio (minutos)
              </FieldLabel>
              {/* @ts-expect-error */}
              <Input
                {...field}
                id={formIds.duration}
                aria-invalid={fieldState.invalid}
                placeholder="30"
                type="number"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="price"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.price}>
                Precio del servicio (COP)
              </FieldLabel>
              {/* @ts-expect-error */}
              <Input
                {...field}
                id={formIds.price}
                aria-invalid={fieldState.invalid}
                placeholder="30000"
                type="number"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button
        type="submit"
        disabled={isPending || isSuccess}
        className="mt-4 w-full"
      >
        {isPending ? (
          <Spinner />
        ) : (
          <>
            <SaveIcon className="size-3" /> Guardar
          </>
        )}
      </Button>

      <Separator className="my-4" />

      <Button
        disabled={isDeleting || isPending}
        type="button"
        variant="destructive"
        className="w-full"
        onClick={() => {
          deleteService({
            serviceId: service._id,
            barbershopId: service.barbershopId,
          });
        }}
      >
        {isDeleting ? (
          <Spinner />
        ) : (
          <>
            <TrashIcon className="size-3" /> Eliminar
          </>
        )}
      </Button>
    </form>
  );
};
