import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { CalendarIcon } from "@phosphor-icons/react";
import { es } from "date-fns/locale";
import type { BaseSyntheticEvent, FC } from "react";
import { Activity, Suspense, useEffect, useState, useTransition } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

import { ServicesDropdown } from "@/components/barbershops/services/services-dropdown";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentFormMetadata } from "@/hooks/use-appointments";
import type { appointmentFormSchema } from "@/lib/schemas";
import {
  cn,
  dateWithTimeOfDay,
  formatLongDate,
  startOfDay,
  toDate,
} from "@/lib/utils";
import { TimeSlotPicker } from "./time-slot-picker";

interface CreateAppointmentFormProps {
  barbershopId: Barbershop["_id"];
  barbers: BarbershopMemberWithName[];
  disabledFields?: (keyof output<typeof appointmentFormSchema>)[];
  isBarber: boolean;
  /** When true, the barber selector is replaced with a hidden input (barber auto-selects themselves). Staff must always see the selector. */
  hideBarberSelector?: boolean;
  onSubmit: (e: BaseSyntheticEvent) => void;
  services: Service[];
  barberServices?: Service[] | null;
  onBarberChange?: (barber: BarbershopMemberWithName) => void;
  form: UseFormReturn<output<typeof appointmentFormSchema>>;
  showPhoneField?: boolean;
  /** The resolved service ID (from store or prop) used for slot generation. */
  effectiveServiceId?: Service["_id"];
  formIds: {
    form: string;
    customerName: string;
    date: string;
    barbershopMemberId: string;
    startTime: string;
    contactPhone: string;
    contactEmail: string;
    serviceId: string;
    notes: string;
  };
}

export const CreateAppointmentForm: FC<CreateAppointmentFormProps> = ({
  barbershopId,
  barbers,
  disabledFields,
  isBarber,
  hideBarberSelector = false,
  onSubmit,
  services,
  barberServices,
  onBarberChange,
  formIds,
  form,
  showPhoneField = false,
  effectiveServiceId,
}) => {
  const { disableDay } = useAppointmentFormMetadata(barbershopId);
  const [isPending, startTransition] = useTransition();
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | undefined>(
    undefined,
  );

  const watchedDate = form.watch("date") as number | undefined;
  const watchedBarber = form.watch("barbershopMemberId") as string | undefined;

  const canShowSlots = !!(watchedDate && watchedBarber && effectiveServiceId);

  // Normalize to midnight so slot selection (which sets hours) doesn't change query params
  const normalizedDate = watchedDate
    ? startOfDay(watchedDate).getTime()
    : undefined;

  // Reset selected slot when barber or service changes (date reset handled in calendar onSelect)
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional — reset on barber/service change
  useEffect(() => {
    setSelectedSlotTime(undefined);
  }, [watchedBarber, effectiveServiceId]);

  // Use barber-specific services if available, otherwise fall back to all services
  const displayServices = barberServices ?? services;

  return (
    <form id={formIds.form} onSubmit={onSubmit} suppressHydrationWarning>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          {(disabledFields?.includes("serviceId") || isBarber) && (
            <Field>
              <FieldLabel
                htmlFor={formIds.serviceId}
                aria-required
                className={cn({
                  hidden: disabledFields?.includes("serviceId") || !isBarber,
                })}
              >
                Servicio
              </FieldLabel>

              <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                <Activity
                  mode={
                    disabledFields?.includes("serviceId") || !isBarber
                      ? "hidden"
                      : "visible"
                  }
                >
                  <ServicesDropdown services={displayServices} />
                </Activity>
              </Suspense>
            </Field>
          )}

          {(isBarber || showPhoneField) && (
            <div
              className={cn("grid gap-4", {
                "grid-cols-2": isBarber && showPhoneField,
              })}
            >
              {isBarber && (
                <Controller
                  name="customerName"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={formIds.customerName}>
                        Nombre del cliente
                      </FieldLabel>
                      <Input
                        {...field}
                        id={formIds.customerName}
                        aria-invalid={fieldState.invalid}
                        placeholder="Marcos Aguilar"
                        autoComplete="given-name"
                        disabled={disabledFields?.includes("customerName")}
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}

              {showPhoneField && (
                <Controller
                  name="contactPhone"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={formIds.contactPhone}>
                        Teléfono de contacto
                      </FieldLabel>
                      <PhoneInput
                        id={formIds.contactPhone}
                        value={field.value ?? ""}
                        onChange={field.onChange}
                        defaultCountry="CO"
                        placeholder="311 987 1234"
                        aria-invalid={fieldState.invalid}
                        disabled={disabledFields?.includes("contactPhone")}
                      />

                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              )}
            </div>
          )}
        </div>

        <div
          className={cn("grid gap-4", {
            "grid-cols-2": isBarber,
          })}
        >
          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field
                data-invalid={fieldState.invalid}
                className={cn({
                  hidden: disabledFields?.includes("contactEmail") || !isBarber,
                  "col-span-2": hideBarberSelector,
                })}
              >
                <FieldLabel htmlFor={formIds.contactEmail}>
                  Email (opcional)
                </FieldLabel>
                <Input
                  {...field}
                  id={formIds.contactEmail}
                  aria-invalid={fieldState.invalid}
                  placeholder="cliente@ejemplo.com"
                  autoComplete="email"
                  type="email"
                  disabled={disabledFields?.includes("contactEmail")}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {hideBarberSelector ? (
            <Controller
              name="barbershopMemberId"
              control={form.control}
              render={({ field }) => <Input {...field} type="hidden" />}
            />
          ) : barbers?.length ? (
            <Controller
              name="barbershopMemberId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formIds.barbershopMemberId}>
                    Barbero
                  </FieldLabel>

                  <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                    <Activity mode={barbers?.length > 1 ? "visible" : "hidden"}>
                      <Select
                        value={field.value?.name}
                        onValueChange={(value) => {
                          const selectedBarber = barbers.find(
                            (barber) => barber.name === value,
                          );

                          if (selectedBarber) {
                            startTransition(() => {
                              field.onChange(selectedBarber._id);
                              onBarberChange?.(selectedBarber);
                            });
                          }
                        }}
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un barbero" />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map((barber) => (
                            <SelectItem key={barber._id} value={barber.name}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Activity>
                  </Suspense>

                  <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                    <Activity mode={barbers?.length > 1 ? "hidden" : "visible"}>
                      <Input
                        id={`${formIds.barbershopMemberId}-display`}
                        disabled
                        value={barbers[0].name}
                      />
                      <Input
                        {...field}
                        id={formIds.barbershopMemberId}
                        type="hidden"
                      />
                    </Activity>
                  </Suspense>

                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ) : (
            <Field className={cn({ "col-span-2": isBarber })}>
              <FieldLabel htmlFor={formIds.barbershopMemberId}>
                {barbers?.length > 1 ? "Seleccione un barbero" : "Barbero"}
              </FieldLabel>

              <span className="text-pretty text-muted-foreground text-sm">
                No hay barberos disponibles para este servicio
              </span>
            </Field>
          )}
        </div>

        <Controller
          name="date"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} suppressHydrationWarning>
              <FieldLabel htmlFor={formIds.date}>Fecha</FieldLabel>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "mb-4 w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        <span
                          className="text-xs sm:text-sm"
                          suppressHydrationWarning
                        >
                          {formatLongDate(field.value as number)}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm">
                          Selecciona una fecha
                        </span>
                      )}
                      <CalendarIcon className="hidden sm:ml-auto sm:block sm:size-3 sm:opacity-50" />
                    </Button>
                  }
                />
                <PopoverContent
                  className="w-auto p-0"
                  align="center"
                  suppressHydrationWarning
                >
                  <Calendar
                    mode="single"
                    selected={toDate(field.value as number | undefined)}
                    onSelect={(date) => {
                      if (!date) {
                        field.onChange(undefined);
                        setSelectedSlotTime(undefined);
                        return;
                      }
                      const combined = startOfDay(date);
                      startTransition(() => {
                        field.onChange(combined.getTime());
                        setSelectedSlotTime(undefined);
                      });
                    }}
                    disabled={disableDay}
                    className="bg-transparent [--cell-size:--spacing(12)]"
                    captionLayout="label"
                    locale={es}
                  />
                </PopoverContent>
              </Popover>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <FieldLabel>Hora disponible</FieldLabel>
          {canShowSlots && normalizedDate ? (
            <Suspense
              fallback={
                <div className="grid grid-cols-3 gap-2 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton
                      key={`slot-skeleton-${i.toString()}`}
                      className="h-9 w-full"
                    />
                  ))}
                </div>
              }
            >
              <TimeSlotPicker
                barbershopId={barbershopId}
                barbershopMemberId={
                  watchedBarber as BarbershopMemberWithName["_id"]
                }
                serviceId={effectiveServiceId}
                date={normalizedDate}
                value={selectedSlotTime}
                isPending={isPending}
                onChange={(slotTime, slotMinutes) => {
                  setSelectedSlotTime(slotTime);
                  const dateObj = dateWithTimeOfDay(
                    normalizedDate ?? Date.now(),
                    slotMinutes,
                  );
                  form.setValue("date", dateObj.getTime(), {
                    shouldValidate: true,
                  });
                }}
              />
            </Suspense>
          ) : (
            <p className="text-muted-foreground text-sm">
              {!watchedDate
                ? "Selecciona una fecha para ver los horarios."
                : !watchedBarber
                  ? "Selecciona un barbero para ver los horarios."
                  : "Selecciona un servicio para ver los horarios."}
            </p>
          )}
        </Field>

        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="mt-4">
              <FieldLabel htmlFor={formIds.notes}>Notas (opcional)</FieldLabel>
              <Textarea
                {...field}
                id={formIds.notes}
                aria-invalid={fieldState.invalid}
                placeholder="Corte con cero, degradado medio-alto, etc."
                rows={4}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </form>
  );
};
