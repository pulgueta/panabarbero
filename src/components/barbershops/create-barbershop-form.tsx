import type { BaseSyntheticEvent, FC } from "react";
import { useEffect } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useColombia } from "@/hooks/use-colombia";
import type { barbershopFormSchema } from "@/lib/schemas";
import { useLocationStore } from "@/store/barbershop-filters";

export type CreateBarbershopFormData = {
  name: string;
  description?: string;
  address: string;
  addressDetails?: string;
  state: string;
  city: string;
  zipCode?: string;
  contactPhone?: string;
};

interface CreateBarbershopFormProps {
  formIds: {
    [key: string]: string;
  };
  form: UseFormReturn<output<typeof barbershopFormSchema>>;
  onSubmit: (e: BaseSyntheticEvent) => void;
}

export const CreateBarbershopForm: FC<CreateBarbershopFormProps> = ({
  formIds,
  form,
  onSubmit,
}) => {
  const { states, citiesFromState } = useColombia();

  const state = useLocationStore((s) => s.state);
  const city = useLocationStore((s) => s.city);
  const setLocationState = useLocationStore((s) => s.setState);
  const setLocationCity = useLocationStore((s) => s.setCity);
  const availableCities = state ? citiesFromState(state) : [];

  useEffect(() => {
    if (state !== form.getValues("state")) {
      form.setValue("state", state ?? "");
    }
    if (city !== form.getValues("city")) {
      form.setValue("city", city ?? "");
    }
  }, [state, city, form]);

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-2">
      <FieldGroup className="gap-4">
        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.name}>Nombre</FieldLabel>
                <Input
                  {...field}
                  id={formIds.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. Barbería Central"
                />

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="address.fullAddress"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.address}>
                  Dirección completa
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.address}
                  aria-invalid={fieldState.invalid}
                  placeholder="Calle 123 #45-67"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="state"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.state}>Departamento</FieldLabel>
                <Select
                  value={state ?? ""}
                  onValueChange={(value) => {
                    setLocationState(value || undefined);
                    setLocationCity(undefined);
                    field.onChange(value);
                    form.setValue("city", "");
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="city"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.city}>Ciudad</FieldLabel>
                <Select
                  value={city ?? ""}
                  onValueChange={(value) => {
                    setLocationCity(value || undefined);
                    field.onChange(value);
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Controller
            name="ownerIsBarber"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.ownerIsBarber}>
                  Tu rol en la barbería
                </FieldLabel>
                <RadioGroup
                  value={field.value ? "owner-barber" : "owner-only"}
                  onValueChange={(value) =>
                    field.onChange(value === "owner-barber")
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="owner-barber"
                      id={formIds.ownerBarber}
                    />
                    <Label
                      htmlFor={formIds.ownerBarber}
                      className="cursor-pointer"
                    >
                      Dueño y barbero
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="owner-only" id={formIds.ownerOnly} />
                    <Label
                      htmlFor={formIds.ownerOnly}
                      className="cursor-pointer"
                    >
                      Solo dueño
                    </Label>
                  </div>
                </RadioGroup>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="gracePeriodMinutes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.gracePeriodMinutes}>
                  Periodo de gracia
                </FieldLabel>

                <Input
                  {...field}
                  id={formIds.gracePeriodMinutes}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. 5"
                  type="number"
                  className="w-full tabular-nums"
                />

                <FieldDescription>
                  Tiempo que el cliente puede llegar tarde sin que se le cancele
                  la cita.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>
    </form>
  );
};
