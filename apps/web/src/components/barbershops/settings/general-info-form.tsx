import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { useId, useRef } from "react";
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
  const nameRef = useRef(barbershop.name);
  const descriptionRef = useRef(barbershop.description ?? "");

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
          name: nameRef.current,
          description: descriptionRef.current || undefined,
          address: barbershop.address,
          services: barbershop.services ?? [],
          contactPhone: barbershop.contactPhone || undefined,
          isActive: barbershop.isActive,
          gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
          ownerId: barbershop.ownerId,
          availability: barbershop.availability ?? [],
          city: barbershop.city,
          state: barbershop.state,
          zipCode: barbershop.zipCode || undefined,
        },
      });
      haptic.trigger("success");
      toast.success("Información actualizada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo actualizar la información. Intenta de nuevo.");
    }
  };

  const nameInvalid = !nameRef.current || nameRef.current.length < 3;

  return (
    <div className="flex h-full w-full flex-1 flex-col justify-between gap-4">
      <FieldGroup className="grid grid-cols-1 gap-4">
        <Field data-invalid={nameInvalid}>
          <FieldLabel htmlFor={ids.name}>Nombre</FieldLabel>
          <Input
            id={ids.name}
            defaultValue={nameRef.current}
            onChange={(e) => {
              nameRef.current = e.target.value;
            }}
          />
          {nameInvalid && (
            <FieldError errors={[{ message: "Nombre requerido" }]} />
          )}
        </Field>

        <Field>
          <FieldLabel htmlFor={ids.description}>Descripción</FieldLabel>
          <Input
            id={ids.description}
            defaultValue={descriptionRef.current}
            onChange={(e) => {
              descriptionRef.current = e.target.value;
            }}
          />
        </Field>
      </FieldGroup>

      <Button onClick={onSubmit} disabled={isUpdatingBarbershop || nameInvalid}>
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
