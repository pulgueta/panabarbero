import type { Barbershop, Service } from "@convex/schema";
import { services } from "@convex/schema";
import { revalidateLogic } from "@tanstack/react-form";
import { useHotkey } from "@tanstack/react-hotkeys";
import type { FC } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { useServiceActions } from "@/hooks/use-services";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import type { ServiceFormData } from "@/lib/schemas";

interface ServiceFormProps {
  initialValues?: ServiceFormData;
  barbershopId: Barbershop["_id"];
  serviceId?: Service["_id"];
  onSuccess?: () => void;
}

export const ServiceForm: FC<ServiceFormProps> = ({
  initialValues,
  barbershopId,
  serviceId,
  onSuccess,
}) => {
  const haptic = useWebHaptics();

  const {
    createServiceMutation: { mutateAsync: createService },
    updateServiceMutation: { mutateAsync: updateService },
  } = useServiceActions();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - convex id schema is not supported by tanstack form
      onSubmit: initialValues ? services.updateSchema : services.insertSchema,
    },
    defaultValues: initialValues
      ? initialValues
      : {
          name: "",
          price: 1000,
          duration: 5,
          barbershopId: barbershopId,
        },
    onSubmit: async ({ value }) => {
      try {
        if (serviceId) {
          await updateService({
            id: serviceId,
            data: {
              name: value.name,
              price: Number(value.price),
              duration: Number(value.duration),
              barbershopId: barbershopId,
            },
          });

          haptic.trigger("success");
          toast.success("Servicio actualizado exitosamente");

          onSuccess?.();
        } else {
          await createService({
            name: value.name,
            price: Number(value.price),
            duration: Number(value.duration),
            barbershopId: barbershopId,
          });

          haptic.trigger("success");
          toast.success("Servicio creado exitosamente");

          onSuccess?.();
        }
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
        return;
      }
    },
  });

  useHotkey("Control+Enter", () => form.handleSubmit(), {
    preventDefault: true,
    stopPropagation: true,
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="w-full space-y-4"
    >
      <FieldGroup>
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Nombre del servicio"
              placeholder="Corte de pelo"
            />
          )}
        </form.AppField>

        <div className="grid grid-cols-2 gap-4">
          <form.AppField name="duration">
            {(field) => (
              <field.TextField
                label="Duración"
                description="En minutos"
                placeholder="30"
                type="number"
                className="w-full tabular-nums"
              />
            )}
          </form.AppField>

          <form.AppField name="price">
            {(field) => (
              <field.TextField
                label="Precio"
                placeholder="30000"
                type="number"
                className="w-full tabular-nums"
              />
            )}
          </form.AppField>
        </div>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Guardar" className="w-full" />
      </form.AppForm>
    </form>
  );
};
