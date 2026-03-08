import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";

interface GeneralInfoFormProps {
  barbershop: Barbershop;
}

export const GeneralInfoForm: FC<GeneralInfoFormProps> = ({ barbershop }) => {
  const ids = {
    name: useId(),
    description: useId(),
  };
  const [name, setName] = useState(barbershop.name);
  const [description, setDescription] = useState(barbershop.description ?? "");

  const {
    updateBarbershopMutation: {
      mutateAsync: updateBarbershop,
      isPending: isUpdatingBarbershop,
    },
  } = useBarbershopActions();

  const haptic = useWebHaptics();

  const onSubmit = async () => {
    try {
      await updateBarbershop({
        id: barbershop._id,
        data: {
          uuid: barbershop.uuid,
          name,
          description: description || undefined,
          address: barbershop.address,
          coordinates: barbershop.coordinates
            ? { x: barbershop.coordinates.x, y: barbershop.coordinates.y }
            : undefined,
          services: barbershop.services ?? [],
          contactPhone: barbershop.contactPhone || undefined,
          isActive: barbershop.isActive,
          gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
          ownerId: barbershop.ownerId,
          availability: barbershop.availability ?? [],
          city: barbershop.city,
          state: barbershop.state,
          zipCode: barbershop.zipCode || undefined,
          bannerUrl: barbershop.bannerUrl || undefined,
        },
      });
      haptic.trigger("success");
      toast.success("Información actualizada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo actualizar la información. Intenta de nuevo.");
    }
  };

  const nameInvalid = !name || name.length < 3;

  return (
    <div className="w-full space-y-4">
      <FieldGroup className="grid grid-cols-1 gap-4">
        <Field data-invalid={nameInvalid}>
          <FieldLabel htmlFor={ids.name}>Nombre</FieldLabel>
          <Input
            id={ids.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {nameInvalid && (
            <FieldError errors={[{ message: "Nombre requerido" }]} />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor={ids.description}>Descripción</FieldLabel>
          <Input
            id={ids.description}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>
      </FieldGroup>

      <Button onClick={onSubmit} disabled={isUpdatingBarbershop || nameInvalid}>
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
