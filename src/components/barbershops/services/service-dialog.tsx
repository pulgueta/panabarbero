import type { Barbershop, Service } from "@convex/tables";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC, ReactElement } from "react";
import { useEffect, useId, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import type { ServiceFormData } from "@/lib/schemas";
import { serviceFormSchema } from "@/lib/schemas";
import { ServiceForm } from "./service-form";

interface ServiceDialogProps {
  barbershopId: Barbershop["_id"];
  initialValues?: ServiceFormData;
  serviceId?: Service["_id"];
  trigger: ReactElement;
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

  const haptic = useWebHaptics();
  const loading = isCreatingService || isUpdatingService;

  const onSubmit = form.handleSubmit(async (data) => {
    try {
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
    } catch (_error) {
      haptic.trigger("error");
      toast.error("No se pudo guardar el servicio. Intenta de nuevo.");
    }
  });

  useEffect(() => {
    if (isCreatedService) {
      haptic.trigger("success");
      toast.success("Servicio creado exitosamente");
    }

    if (isUpdatedService) {
      haptic.trigger("success");
      toast.success("Servicio actualizado exitosamente");
      setOpen(false);
    }
  }, [isCreatedService, isUpdatedService, haptic]);

  const headLabel = `${initialValues ? "Editar" : "Agregar"} servicio`;
  const description = `${initialValues ? "Actualiza los datos del servicio." : "Define los datos básicos del servicio."}`;

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{headLabel}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ServiceForm
          // @ts-expect-error - zod's coerce method returns an unknown type
          form={form}
          onSubmit={onSubmit}
          formIds={formIds}
          initialValues={initialValues}
        />

        <ResponsiveModalFooter>
          <Field>
            <Button type="submit" form={formIds.form} disabled={loading}>
              {loading ? <Spinner /> : "Guardar"}
            </Button>
          </Field>
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
