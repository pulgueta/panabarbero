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
  /** Omit when driving the modal externally via `open` / `onOpenChange`. */
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const ServiceDialog: FC<ServiceDialogProps> = ({
  barbershopId,
  initialValues,
  serviceId,
  trigger,
  open: controlledOpen,
  onOpenChange,
}) => {
  const [internalOpen, setInternalOpen] = useState<boolean>(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (next: boolean) => {
    if (!isControlled) setInternalOpen(next);
    onOpenChange?.(next);
  };

  const headLabel = `${initialValues ? "Editar" : "Agregar"} servicio`;
  const description = `${initialValues ? "Actualiza los datos del servicio." : "Define los datos básicos del servicio."}`;

  return (
    <ResponsiveModal open={open} onOpenChange={setOpen}>
      {trigger ? <ResponsiveModalTrigger render={trigger} /> : null}
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
