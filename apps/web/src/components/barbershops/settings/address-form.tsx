import type { Barbershop } from "@convex/schema";
import type { FC } from "react";
import { useEffect, useId, useMemo, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopActions } from "@/hooks/barbershop/use-barbershop";
import { useColombia } from "@/hooks/use-colombia";
import { useLocationStore } from "@/store/barbershop-filters";

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
  const state = useLocationStore((s) => s.state);
  const city = useLocationStore((s) => s.city);
  const setLocationState = useLocationStore((s) => s.setState);
  const setLocationCity = useLocationStore((s) => s.setCity);

  const fullAddressRef = useRef(barbershop.address.fullAddress);
  const detailsRef = useRef(barbershop.address.details ?? "");
  const zipRef = useRef(barbershop.zipCode ?? "");

  const availableCities = useMemo(
    () => (state ? citiesFromState(state) : []),
    [state, citiesFromState],
  );

  useEffect(() => {
    if (barbershop.state && barbershop.state !== state) {
      setLocationState(barbershop.state);
    }
    if (barbershop.city && barbershop.city !== city) {
      setLocationCity(barbershop.city);
    }
  }, [
    barbershop.state,
    barbershop.city,
    state,
    city,
    setLocationState,
    setLocationCity,
  ]);

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
          name: barbershop.name,
          description: barbershop.description || undefined,
          address: {
            fullAddress: fullAddressRef.current,
            details: detailsRef.current || undefined,
          },
          services: barbershop.services ?? [],
          contactPhone: barbershop.contactPhone || undefined,
          isActive: barbershop.isActive,
          gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
          ownerId: barbershop.ownerId,
          availability: barbershop.availability ?? [],
          city: city ?? "",
          state: state ?? "",
          zipCode: zipRef.current || undefined,
        },
      });
      haptic.trigger("success");
      toast.success("Dirección actualizada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo actualizar la dirección. Intenta de nuevo.");
    }
  };

  const invalid = !fullAddressRef.current || !state || !city;

  return (
    <div className="flex h-full flex-1 flex-col justify-between gap-4">
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Field data-invalid={!fullAddressRef.current}>
            <FieldLabel htmlFor={ids.address}>Dirección</FieldLabel>
            <Input
              id={ids.address}
              defaultValue={fullAddressRef.current}
              onChange={(e) => {
                fullAddressRef.current = e.target.value;
              }}
            />
            {!fullAddressRef.current && (
              <FieldError errors={[{ message: "Dirección requerida" }]} />
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor={ids.details}>Detalles</FieldLabel>
            <Input
              id={ids.details}
              defaultValue={detailsRef.current}
              onChange={(e) => {
                detailsRef.current = e.target.value;
              }}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field data-invalid={!state}>
            <FieldLabel htmlFor={ids.state}>Departamento</FieldLabel>
            <Select
              value={state}
              onValueChange={(v) => {
                if (!v) return;

                setLocationState(v);
                setLocationCity(undefined);
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
            <Select
              value={city}
              onValueChange={(value) => {
                if (!value) return;
                setLocationCity(value);
              }}
              disabled={!state}
            >
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
              defaultValue={zipRef.current}
              onChange={(e) => {
                zipRef.current = e.target.value;
              }}
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
