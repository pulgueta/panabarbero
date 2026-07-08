import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";

interface PreferencesFormProps {
  barbershop: Barbershop;
}

export const PreferencesForm: FC<PreferencesFormProps> = ({ barbershop }) => {
  const id = useId();
  const [grace, setGrace] = useState<string>(
    String(barbershop.gracePeriodMinutes ?? 5),
  );

  const {
    updateBarbershopMutation: {
      mutateAsync: updateBarbershop,
      isPending: isUpdatingBarbershop,
    },
  } = useBarbershopActions();

  const haptic = useWebHaptics();

  const onSubmit = async () => {
    const gracePeriodMinutes = Number(grace);

    try {
      await updateBarbershop({
        id: barbershop._id,
        data: {
          uuid: barbershop.uuid,
          name: barbershop.name,
          description: barbershop.description || undefined,
          address: barbershop.address,
          services: barbershop.services ?? [],
          contactPhone: barbershop.contactPhone || undefined,
          isActive: barbershop.isActive,
          gracePeriodMinutes,
          ownerId: barbershop.ownerId,
          availability: barbershop.availability ?? [],
          city: barbershop.city,
          state: barbershop.state,
          zipCode: barbershop.zipCode || undefined,
        },
      });
      haptic.trigger("success");
      toast.success("Preferencias actualizadas correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo actualizar las preferencias. Intenta de nuevo.");
    }
  };

  const invalidGrace = Number.isNaN(Number(grace)) || Number(grace) < 0;

  return (
    <div className="flex h-full flex-1 flex-col justify-between gap-4">
      <FieldGroup>
        <Field data-invalid={invalidGrace}>
          <FieldLabel htmlFor={id}>Periodo de gracia (minutos)</FieldLabel>

          <Input
            id={id}
            type="number"
            value={grace}
            onChange={(e) => setGrace(e.target.value)}
            className="tabular-nums"
          />

          <FieldDescription>
            Tiempo que el cliente puede llegar tarde sin que se le cancele la
            cita.
          </FieldDescription>
          {invalidGrace && (
            <FieldError errors={[{ message: "Valor inválido" }]} />
          )}
        </Field>
      </FieldGroup>
      <Button
        onClick={onSubmit}
        disabled={isUpdatingBarbershop || invalidGrace}
      >
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
