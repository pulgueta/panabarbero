import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId, useState } from "react";

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

  const onSubmit = async () => {
    await updateBarbershop({
      barbershopId: barbershop._id,
      barbershop: {
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
        metadata: {
          websiteUrl: barbershop.metadata?.websiteUrl || undefined,
          contactEmail: barbershop.metadata?.contactEmail || undefined,
          completedAppointments: barbershop.metadata?.completedAppointments,
          reviews: barbershop.metadata?.reviews,
          rating: barbershop.metadata?.rating,
          socialMedia: barbershop.metadata?.socialMedia || undefined,
        },
      },
    });
  };

  const nameInvalid = !name || name.length < 3;

  return (
    <div className="space-y-4">
      <FieldGroup className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
