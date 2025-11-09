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

interface CoordinatesFormProps {
  barbershop: Barbershop;
}

export const CoordinatesForm: FC<CoordinatesFormProps> = ({ barbershop }) => {
  const ids = {
    lat: useId(),
    lng: useId(),
  };
  const [lat, setLat] = useState(
    barbershop.coordinates?.y ? String(barbershop.coordinates.y) : "",
  );
  const [lng, setLng] = useState(
    barbershop.coordinates?.x ? String(barbershop.coordinates.x) : "",
  );

  const {
    updateBarbershopMutation: { mutateAsync: updateBarbershop, isPending },
  } = useBarbershopActions();

  const onSubmit = async () => {
    const x = lng ? Number(lng) : undefined;
    const y = lat ? Number(lat) : undefined;

    await updateBarbershop({
      barbershopId: barbershop._id,
      barbershop: {
        uuid: barbershop.uuid,
        name: barbershop.name,
        description: barbershop.description || undefined,
        address: barbershop.address,
        coordinates: x !== undefined && y !== undefined ? { x, y } : undefined,
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

  const invalidLat = !!lat && Number.isNaN(Number(lat));
  const invalidLng = !!lng && Number.isNaN(Number(lng));

  return (
    <div className="space-y-4">
      <FieldGroup>
        <Field data-invalid={invalidLat}>
          <FieldLabel htmlFor={ids.lat}>Latitud</FieldLabel>
          <Input
            id={ids.lat}
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="4.711"
          />
          {invalidLat && (
            <FieldError errors={[{ message: "Debe ser un número" }]} />
          )}
        </Field>
        <Field data-invalid={invalidLng}>
          <FieldLabel htmlFor={ids.lng}>Longitud</FieldLabel>
          <Input
            id={ids.lng}
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="-74.072"
          />
          {invalidLng && (
            <FieldError errors={[{ message: "Debe ser un número" }]} />
          )}
        </Field>
      </FieldGroup>

      <Button
        onClick={onSubmit}
        disabled={isPending || invalidLat || invalidLng}
      >
        {isPending ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
