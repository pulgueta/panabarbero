import type { BarbershopMemberWithName, Service } from "@convex/schema";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";
import { useBarbershopMemberActions } from "@/hooks/use-barbershop-members";
import { getConvexErrorMessage } from "@/lib/convex-errors";

interface ManageServicesEditorProps {
  barbershopMember: BarbershopMemberWithName;
  services: Service[];
  currentServices: Service[];
  onCancel?: () => void;
  onSuccess?: () => void;
}

export const ManageServicesEditor: FC<ManageServicesEditorProps> = ({
  barbershopMember,
  services,
  currentServices,
  onCancel,
  onSuccess,
}) => {
  const dialogId = useId();

  const haptic = useWebHaptics();

  const [selectedServices, setSelectedServices] = useState<Set<Service["_id"]>>(
    () => new Set(currentServices?.map((s) => s._id)),
  );

  const {
    setBarberServicesMutation: {
      mutateAsync: setBarberServices,
      isPending: isSettingBarberServices,
    },
  } = useBarbershopMemberActions();

  const handleToggleService = (serviceId: Service["_id"]) => {
    setSelectedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        haptic.trigger("selection");
        next.delete(serviceId);
      } else {
        haptic.trigger("selection");
        next.add(serviceId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    haptic.trigger("selection");
    setSelectedServices(new Set(services.map((s) => s._id)));
  };

  const handleClearAll = () => {
    haptic.trigger("selection");
    setSelectedServices(new Set());
  };

  const handleSave = async () => {
    try {
      await setBarberServices({
        barbershopMember: { id: barbershopMember._id },
        services: Array.from(selectedServices).map((id) => ({ id })),
      });
      haptic.trigger("success");
      toast.success("Servicios actualizados correctamente");
      onSuccess?.();
    } catch (error) {
      haptic.trigger("error");
      toast.error(getConvexErrorMessage(error));
    }
  };

  const isSameServices =
    selectedServices.size === currentServices.length &&
    currentServices.every((service) => selectedServices.has(service._id));

  return (
    <div className="space-y-4">
      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={handleSelectAll}>
          <CheckIcon className="size-3" />
          Todos
        </Button>
        <Button variant="outline" onClick={handleClearAll}>
          <XIcon className="size-3" />
          Ninguno
        </Button>
      </div>

      <div className="space-y-2">
        {services.map((service) => {
          const checkboxId = `${dialogId}-service-${service._id}`;

          return (
            <div
              key={service._id}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <Checkbox
                id={checkboxId}
                checked={selectedServices.has(service._id)}
                onCheckedChange={() => {
                  haptic.trigger("light");
                  handleToggleService(service._id);
                }}
              />
              <Label
                htmlFor={checkboxId}
                className="flex-1 cursor-pointer font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {service.name}
              </Label>
            </div>
          );
        })}
      </div>

      {services.length === 0 && (
        <p className="text-center text-muted-foreground text-sm">
          No hay servicios creados para esta barbería.
        </p>
      )}

      <ResponsiveModalFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isSettingBarberServices}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSettingBarberServices || isSameServices}
        >
          Guardar cambios
        </Button>
      </ResponsiveModalFooter>
    </div>
  );
};

interface ManageServicesDialogProps extends ManageServicesEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ManageServicesDialog: FC<ManageServicesDialogProps> = ({
  barbershopMember,
  services,
  currentServices,
  open,
  onOpenChange,
}) => {
  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalTrigger
        render={<Button variant="outline">Gestionar servicios</Button>}
      />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>
            Servicios de {barbershopMember.name}
          </ResponsiveModalTitle>
          <ResponsiveModalDescription>
            Selecciona los servicios que este barbero puede ofrecer.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>

        <ManageServicesEditor
          barbershopMember={barbershopMember}
          services={services}
          currentServices={currentServices}
          onCancel={() => onOpenChange(false)}
          onSuccess={() => onOpenChange(false)}
        />
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
