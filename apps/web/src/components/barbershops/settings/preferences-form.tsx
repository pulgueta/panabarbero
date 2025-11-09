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
import { useBarbershopActions } from "@/hooks/use-barbershop";

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

  const onSubmit = async () => {
    const gracePeriodMinutes = Number(grace);

    await updateBarbershop({
      barbershopId: barbershop._id,
      barbershop: {
        uuid: barbershop.uuid,
        name: barbershop.name,
        description: barbershop.description || undefined,
        address: barbershop.address,
        coordinates: barbershop.coordinates
          ? { x: barbershop.coordinates.x, y: barbershop.coordinates.y }
          : undefined,
        services: barbershop.services ?? [],
        contactPhone: barbershop.contactPhone || undefined,
        isActive: barbershop.isActive,
        gracePeriodMinutes,
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

  const invalidGrace = Number.isNaN(Number(grace)) || Number(grace) < 0;

  return (
    <div className="space-y-4">
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
