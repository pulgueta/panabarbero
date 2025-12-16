import { useColombia } from "@panabarbero/constants";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";

interface AddressFormProps {
  barbershop: Barbershop;
}

export const AddressForm: FC<AddressFormProps> = ({ barbershop }) => {
  const ids = {
    address: useId(),
    details: useId(),
    state: useId(),
    city: useId(),
    zip: useId(),
  };
  const { states, citiesFromState } = useColombia();

  const [fullAddress, setFullAddress] = useState(
    barbershop.address.fullAddress,
  );
  const [details, setDetails] = useState(barbershop.address.details ?? "");
  const [state, setState] = useState(barbershop.state);
  const [city, setCity] = useState(barbershop.city);
  const [zip, setZip] = useState(barbershop.zipCode ?? "");

  const availableCities = useMemo(
    () => (state ? citiesFromState(state) : []),
    [state, citiesFromState],
  );

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
        name: barbershop.name,
        description: barbershop.description || undefined,
        address: {
          fullAddress,
          details: details || undefined,
        },
        coordinates: barbershop.coordinates
          ? { x: barbershop.coordinates.x, y: barbershop.coordinates.y }
          : undefined,
        services: barbershop.services ?? [],
        contactPhone: barbershop.contactPhone || undefined,
        isActive: barbershop.isActive,
        gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
        ownerId: barbershop.ownerId,
        availability: barbershop.availability ?? [],
        city,
        state,
        zipCode: zip || undefined,
        bannerUrl: barbershop.bannerUrl || undefined,
      },
    });
  };

  const invalid = !fullAddress || !state || !city;

  return (
    <div className="space-y-4">
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!fullAddress}>
            <FieldLabel htmlFor={ids.address}>Dirección</FieldLabel>
            <Input
              id={ids.address}
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
            />
            {!fullAddress && (
              <FieldError errors={[{ message: "Dirección requerida" }]} />
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor={ids.details}>Detalles</FieldLabel>
            <Input
              id={ids.details}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field data-invalid={!state}>
            <FieldLabel htmlFor={ids.state}>Departamento</FieldLabel>
            <Select
              value={state}
              onValueChange={(v) => {
                setState(v);
                setCity("");
              }}
            >
              <SelectTrigger className="w-full bg-background dark:bg-card">
                <SelectValue placeholder="Selecciona departamento" />
              </SelectTrigger>
              <SelectContent>
                {states.map((s) => (
                  <SelectItem key={s.state} value={s.state}>
                    {s.state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!state && (
              <FieldError errors={[{ message: "Departamento requerido" }]} />
            )}
          </Field>

          <Field data-invalid={!city}>
            <FieldLabel htmlFor={ids.city}>Ciudad</FieldLabel>
            <Select value={city} onValueChange={setCity} disabled={!state}>
              <SelectTrigger className="w-full bg-background dark:bg-card">
                <SelectValue placeholder="Selecciona ciudad" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!city && <FieldError errors={[{ message: "Ciudad requerida" }]} />}
          </Field>

          <Field>
            <FieldLabel htmlFor={ids.zip}>Código postal</FieldLabel>
            <Input
              id={ids.zip}
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </Field>
        </div>
      </FieldGroup>

      <Button onClick={onSubmit} disabled={isUpdatingBarbershop || invalid}>
        {isUpdatingBarbershop ? <Spinner /> : "Guardar"}
      </Button>
    </div>
  );
};
