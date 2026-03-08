import type { Barbershop, Service } from "@convex/schema";
import type { FC, ReactElement } from "react";
import { useState } from "react";

import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import type { ServiceFormData } from "@/lib/schemas";
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
  const [open, setOpen] = useState<boolean>(false);

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

        <ResponsiveModalFooter>
          <ServiceForm
            initialValues={initialValues}
            barbershopId={barbershopId}
            serviceId={serviceId}
            onSuccess={() => setOpen(false)}
          />
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
