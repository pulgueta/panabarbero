import { zodResolver } from "@hookform/resolvers/zod";
import { useColombia } from "@panabarbero/constants";
import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

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
import { barbershopFormSchema, socialPlatforms } from "@/lib/schemas";

type SocialRow = { platform: (typeof socialPlatforms)[number]; url: string };

interface BarbershopDetailsFormProps {
  barbershop: Barbershop;
}

export const BarbershopDetailsForm: FC<BarbershopDetailsFormProps> = ({
  barbershop,
}) => {
  const formIds = {
    form: useId(),
    name: useId(),
    description: useId(),
    contactPhone: useId(),
    grace: useId(),
    state: useId(),
    city: useId(),
    zip: useId(),
    address: useId(),
    addressDetails: useId(),
    bannerUrl: useId(),
    websiteUrl: useId(),
    contactEmail: useId(),
    coordLat: useId(),
    coordLng: useId(),
  };

  const { states, citiesFromState } = useColombia();

  const [social, setSocial] = useState<SocialRow[]>(
    barbershop.metadata?.socialMedia ?? [],
  );

  const initialCoords = {
    x: barbershop.coordinates?.x ?? undefined,
    y: barbershop.coordinates?.y ?? undefined,
  };

  const form = useForm({
    resolver: zodResolver(barbershopFormSchema),
    defaultValues: {
      name: barbershop.name,
      description: barbershop.description ?? "",
      address: {
        fullAddress: barbershop.address.fullAddress,
        details: barbershop.address.details ?? "",
      },
      city: barbershop.city,
      state: barbershop.state,
      zipCode: barbershop.zipCode ?? "",
      contactPhone: barbershop.contactPhone ?? "",
      bannerUrl: barbershop.bannerUrl ?? "",
      gracePeriodMinutes: barbershop.gracePeriodMinutes ?? 5,
      isActive: barbershop.isActive,
      availability: barbershop.availability ?? [],
      metadata: {
        websiteUrl: barbershop.metadata?.websiteUrl ?? "",
        contactEmail: barbershop.metadata?.contactEmail ?? "",
        completedAppointments: barbershop.metadata?.completedAppointments,
        reviews: barbershop.metadata?.reviews,
        rating: barbershop.metadata?.rating,
        socialMedia: barbershop.metadata?.socialMedia ?? [],
      },
    },
  });

  useEffect(() => {
    form.setValue("metadata.socialMedia", social);
  }, [social, form]);

  const selectedState = form.watch("state");
  const availableCities = useMemo(
    () => (selectedState ? citiesFromState(selectedState) : []),
    [selectedState, citiesFromState],
  );

  const {
    updateBarbershopMutation: {
      mutateAsync: updateBarbershop,
      isPending: isUpdatingBarbershop,
    },
  } = useBarbershopActions();

  const [lat, setLat] = useState<string>(
    initialCoords.y ? String(initialCoords.y) : "",
  );
  const [lng, setLng] = useState<string>(
    initialCoords.x ? String(initialCoords.x) : "",
  );

  const onSubmit = form.handleSubmit(async (values) => {
    await updateBarbershop({
      barbershopId: barbershop._id,
      barbershop: {
        uuid: barbershop.uuid,
        name: values.name,
        description: values.description || undefined,
        address: {
          fullAddress: values.address.fullAddress,
          details: values.address.details || undefined,
        },
        coordinates:
          lat && lng
            ? {
                x: Number(lng),
                y: Number(lat),
              }
            : undefined,
        services: barbershop.services ?? [],
        contactPhone: values.contactPhone || undefined,
        isActive: barbershop.isActive,
        gracePeriodMinutes: values.gracePeriodMinutes ?? 5,
        ownerId: barbershop.ownerId,
        availability: barbershop.availability ?? [],
        city: values.city,
        state: values.state,
        zipCode: values.zipCode || undefined,
        bannerUrl: values.bannerUrl || undefined,
        metadata: {
          websiteUrl: values.metadata?.websiteUrl || undefined,
          contactEmail: values.metadata?.contactEmail || undefined,
          completedAppointments: barbershop.metadata?.completedAppointments,
          reviews: barbershop.metadata?.reviews,
          rating: barbershop.metadata?.rating,
          socialMedia: social.length ? social : undefined,
        },
      },
    });
  });

  const addSocial = () =>
    setSocial((prev) => [...prev, { platform: "instagram", url: "" }]);
  const removeSocial = (idx: number) =>
    setSocial((prev) => prev.filter((_, i) => i !== idx));
  const updateSocial = (idx: number, next: SocialRow) =>
    setSocial((prev) => prev.map((s, i) => (i === idx ? next : s)));

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-4">
      <FieldGroup>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  Teléfono de contacto
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.contactPhone}
                  aria-invalid={fieldState.invalid}
                />
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
              <FieldLabel htmlFor={formIds.description}>Descripción</FieldLabel>
              <Input
                {...field}
                id={formIds.description}
                aria-invalid={fieldState.invalid}
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
                  Detalles de dirección
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.addressDetails}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <Controller
            name="zipCode"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.zip}>Código postal</FieldLabel>
                <Input
                  {...field}
                  id={formIds.zip}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Controller
            name="bannerUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.bannerUrl}>Banner URL</FieldLabel>
                <Input
                  {...field}
                  id={formIds.bannerUrl}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://..."
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="metadata.websiteUrl"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.websiteUrl}>Sitio web</FieldLabel>
                <Input
                  {...field}
                  id={formIds.websiteUrl}
                  aria-invalid={fieldState.invalid}
                  placeholder="https://..."
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
          <Controller
            name="metadata.contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.contactEmail}>
                  Email de contacto
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.contactEmail}
                  aria-invalid={fieldState.invalid}
                  placeholder="correo@dominio.com"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={formIds.coordLat}>Latitud</FieldLabel>
            <Input
              id={formIds.coordLat}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="Ej. 4.711"
              inputMode="decimal"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={formIds.coordLng}>Longitud</FieldLabel>
            <Input
              id={formIds.coordLng}
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-74.072"
              inputMode="decimal"
            />
          </Field>
          <Controller
            name="gracePeriodMinutes"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.grace}>
                  Periodo de gracia (min)
                </FieldLabel>
                {/* @ts-expect-error */}
                <Input
                  {...field}
                  id={formIds.grace}
                  type="number"
                  aria-invalid={fieldState.invalid}
                  className="tabular-nums"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </div>

        <div className="space-y-2">
          <div className="font-medium">Redes sociales</div>
          {social.map((row, idx) => (
            <div
              key={`${row.platform}-${idx}`}
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
            >
              <div>
                <Select
                  value={row.platform}
                  onValueChange={(v) =>
                    updateSocial(idx, {
                      ...row,
                      platform: v as SocialRow["platform"],
                    })
                  }
                >
                  <SelectTrigger className="w-full bg-background dark:bg-card">
                    <SelectValue placeholder="Plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    {socialPlatforms.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 sm:col-span-2">
                <Input
                  value={row.url}
                  onChange={(e) =>
                    updateSocial(idx, { ...row, url: e.target.value })
                  }
                  placeholder="https://..."
                />
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => removeSocial(idx)}
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" onClick={addSocial}>
            Agregar red social
          </Button>
        </div>
      </FieldGroup>

      <div className="mt-2">
        <Button
          type="submit"
          className="w-full sm:w-auto"
          disabled={isUpdatingBarbershop}
        >
          {isUpdatingBarbershop ? <Spinner /> : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
};
