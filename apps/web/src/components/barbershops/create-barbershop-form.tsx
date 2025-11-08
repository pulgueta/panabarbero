import { zodResolver } from "@hookform/resolvers/zod";
import { useColombia } from "@panabarbero/constants";
import type { Barbershop } from "@panabarbero/convex/schemas";
import { InfoIcon } from "lucide-react";
import { type FC, useId } from "react";
import { Controller, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBarbershopActions } from "@/hooks/use-barbershop";
import { barbershopFormSchema } from "@/lib/schemas";

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
  onSuccess?: (barbershopId: Barbershop["_id"]) => void;
  userId: string | undefined;
}

export const CreateBarbershopForm: FC<CreateBarbershopFormProps> = ({
  onSuccess,
  userId,
}) => {
  const formIds = {
    form: useId(),
    name: useId(),
    gracePeriodMinutes: useId(),
    description: useId(),
    address: useId(),
    addressDetails: useId(),
    state: useId(),
    city: useId(),
    zipCode: useId(),
    contactPhone: useId(),
  };

  const { states, citiesFromState } = useColombia();

  const form = useForm({
    resolver: zodResolver(barbershopFormSchema),
    defaultValues: {
      address: {
        fullAddress: "",
        details: undefined,
      },
      city: "",
      state: "",
      zipCode: "",
      contactPhone: "",
      metadata: {
        completedAppointments: undefined,
        reviews: undefined,
        rating: undefined,
        socialMedia: undefined,
        contactEmail: undefined,
        websiteUrl: undefined,
      },
      isActive: false,
      gracePeriodMinutes: 5,
      availability: [
        {
          weekDay: {
            day: "monday",
            isActive: true,
          },
          openAt: "09:00",
          closeAt: "18:00",
        },
      ],
    },
  });

  const {
    createBarbershop: { mutateAsync: createBarbershop, isPending },
  } = useBarbershopActions();

  const onSubmit = form.handleSubmit(async (data) => {
    if (!userId) return;

    const barbershopId = await createBarbershop({
      barbershop: {
        ...data,
        ownerId: userId,
        uuid: crypto.randomUUID(),
      },
    });

    if (onSuccess) onSuccess(barbershopId);
  });

  console.log(form.formState.errors);

  const selectedState = form.watch("state");
  const availableCities = selectedState ? citiesFromState(selectedState) : [];

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-2">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="name"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.name}>
                  Nombre de la barbería
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.name}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. Barbería Central"
                />
                <FieldDescription>
                  Este será el nombre por el que los clientes te encontrarán.
                </FieldDescription>
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
                  Periodo de gracia (minutos)
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="size-4 animate-pulse" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        Se recomienda establecer un periodo de gracia en el cual
                        los clientes pueden llegar minutos después de la hora de
                        su reserva sin perderla.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </FieldLabel>

                {/* @ts-expect-error */}
                <Input
                  {...field}
                  id={formIds.gracePeriodMinutes}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. 5"
                  type="number"
                  className="w-full tabular-nums"
                />

                <FieldDescription>
                  Por defecto siempre se establecerá en 5 minutos.
                </FieldDescription>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.description}>
                Descripción (opcional)
              </FieldLabel>
              <Input
                {...field}
                id={formIds.description}
                aria-invalid={fieldState.invalid}
                placeholder="Describe brevemente tu barbería"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="address.fullAddress"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.address}>Dirección</FieldLabel>
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

          <Controller
            name="address.details"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.addressDetails}>
                  Detalles de dirección (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.addressDetails}
                  aria-invalid={fieldState.invalid}
                  placeholder="Barrio, referencia, etc."
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="state"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.state}>Departamento</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
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
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!selectedState}
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="zipCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.zipCode}>
                  Código postal (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.zipCode}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. 111111"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="contactPhone"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.contactPhone}>
                  Teléfono de contacto (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.contactPhone}
                  aria-invalid={fieldState.invalid}
                  placeholder="Ej. 3001234567"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <div className="mt-8">
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? <Spinner /> : "Crear barbería"}
        </Button>
      </div>
    </form>
  );
};
