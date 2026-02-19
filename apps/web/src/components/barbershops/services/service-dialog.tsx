import type { Barbershop, Service } from "@convex/tables";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC, ReactNode } from "react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import type { ServiceFormData } from "@/lib/schemas";
import { serviceFormSchema } from "@/lib/schemas";
import { ServiceForm } from "./service-form";

interface ServiceDialogProps {
  barbershopId: Barbershop["_id"];
  initialValues?: ServiceFormData;
  serviceId?: Service["_id"];
  trigger: ReactNode;
}

export const ServiceDialog: FC<ServiceDialogProps> = ({
  barbershopId,
  initialValues,
  serviceId,
  trigger,
}) => {
  const formIds = {
    form: useId(),
    name: useId(),
    price: useId(),
    duration: useId(),
  };
  const [open, setOpen] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: initialValues ?? {
      name: "",
      price: undefined,
      duration: 5,
      barbershopId,
    },
  });

  const {
    createServiceMutation: {
      mutateAsync: createService,
      isPending: isCreatingService,
      isSuccess: isCreatedService,
    },
    updateServiceMutation: {
      mutateAsync: updateService,
      isPending: isUpdatingService,
      isSuccess: isUpdatedService,
    },
  } = useServiceActions();

  const loading = isCreatingService || isUpdatingService;

  const onSubmit = form.handleSubmit(async (data) => {
    if (initialValues && serviceId) {
      await updateService({
        service: {
          ...data,
        },
        serviceId,
      });
      return;
    }

    await createService({
      service: {
        ...data,
        uuid: crypto.randomUUID(),
        barbershopId,
      },
    });

    form.reset();
    setOpen(false);
  });

  useEffect(() => {
    if (isCreatedService) {
      toast.success("Servicio creado exitosamente");
    }

    if (isUpdatedService) {
      toast.success("Servicio actualizado exitosamente");
      setOpen(false);
    }
  }, [isCreatedService, isUpdatedService]);

  const headLabel = `${initialValues ? "Editar" : "Agregar"} servicio`;
  const description = `${initialValues ? "Actualiza los datos del servicio." : "Define los datos básicos del servicio."}`;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{headLabel}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <ServiceForm
          // @ts-expect-error - zod's coerce method returns an unknown type
          form={form}
          onSubmit={onSubmit}
          formIds={formIds}
          initialValues={initialValues}
        />

        <DialogFooter>
          <Field>
            <Button type="submit" form={formIds.form} disabled={loading}>
              {loading ? <Spinner /> : "Guardar"}
            </Button>
          </Field>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
