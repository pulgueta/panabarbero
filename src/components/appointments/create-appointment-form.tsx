import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { CalendarIcon } from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { es } from "date-fns/locale";
import type { FC } from "react";
import { Activity, Suspense, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import type { output } from "zod";

import { ServicesDropdown } from "@/components/barbershops/services/services-dropdown";
import { useAppForm } from "@/components/form/use-form";
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
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import { validateAppointmentTime } from "@/lib/schedule-utils";
import { appointmentFormSchema } from "@/lib/schemas";
import {
  cn,
  dateWithTimeOfDay,
  formatLongDate,
  startOfDay,
  toDate,
} from "@/lib/utils";
import { TimeSlotPicker } from "./time-slot-picker";

interface AppointmentFormValues {
  customerName: string;
  date?: number;
  contactPhone: string;
  contactEmail?: string;
  notes?: string;
  barbershopMemberId?: BarbershopMemberWithName["_id"];
}

interface CreateAppointmentFormProps {
  barbershopId: Barbershop["_id"];
  barbers: BarbershopMemberWithName[];
  disabledFields?: (keyof output<typeof appointmentFormSchema>)[];
  isBarber: boolean;
  /** When true, the barber selector is replaced with a hidden input (barber auto-selects themselves). Staff must always see the selector. */
  hideBarberSelector?: boolean;
  services: Service[];
  barberServices?: Service[] | null;
  onBarberChange?: (barber: BarbershopMemberWithName) => void;
  showPhoneField?: boolean;
  /** The resolved service ID (from store or prop) used for slot generation. */
  effectiveServiceId?: Service["_id"];
  initialValues: Partial<
    Pick<
      AppointmentFormValues,
      | "customerName"
      | "contactPhone"
      | "contactEmail"
      | "barbershopMemberId"
      | "date"
    >
  >;
  onSuccess: () => void;
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
  services,
  barberServices,
  onBarberChange,
  formIds,
  showPhoneField = false,
  effectiveServiceId,
  initialValues,
  onSuccess,
}) => {
  const { disableDay, scheduleForDate } =
    useAppointmentFormMetadata(barbershopId);
  const [isPending, startTransition] = useTransition();
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | undefined>(
    undefined,
  );

  const haptic = useWebHaptics();

  const {
    createAppointment: { mutateAsync: createAppointment },
  } = useAppointmentActions();

  const defaultValues: AppointmentFormValues = {
    date: initialValues.date,
    customerName: initialValues.customerName ?? "",
    contactPhone: initialValues.contactPhone ?? "",
    contactEmail: initialValues.contactEmail,
    notes: "",
    barbershopMemberId: initialValues.barbershopMemberId,
  };

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
      toast.error("Revisa los datos del formulario e inténtalo de nuevo.");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      // @ts-expect-error - zod's coerce method returns an unknown input type
      onSubmit: appointmentFormSchema,
    },
    defaultValues,
    onSubmit: async ({ value }) => {
      const { date, barbershopMemberId, contactPhone } = value;

      if (
        date === undefined ||
        !barbershopMemberId ||
        !effectiveServiceId ||
        !contactPhone
      ) {
        haptic.trigger("error");
        toast.error("Selecciona servicio, barbero, fecha y hora.");
        return;
      }

      const schedule = scheduleForDate(date);
      const validation = validateAppointmentTime(schedule, date);

      if (!validation.valid) {
        toast.error(validation.error);
        return;
      }

      try {
        await createAppointment({
          appointment: {
            customerName: value.customerName,
            date,
            contactPhone,
            contactEmail: value.contactEmail,
            notes: value.notes,
            barbershopId,
            barbershopMemberId,
            serviceIds: [effectiveServiceId],
            isStaffCreated: isBarber,
          },
        });

        form.reset();
        setSelectedSlotTime(undefined);
        haptic.trigger("success");
        toast.success("Cita reservada exitosamente");
        onSuccess();
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
      }
    },
  });

  // Auto-select when the available barber list narrows to exactly 1.
  // Applies to customers always, and to staff when a service filters the list.
  // The dialog mirrors this narrowing for its own selectedBarber state.
  useEffect(() => {
    if (barbers?.length !== 1 || hideBarberSelector) {
      return;
    }
    const onlyBarber = barbers[0];
    if (
      !onlyBarber ||
      form.state.values.barbershopMemberId === onlyBarber._id
    ) {
      return;
    }
    form.setFieldValue("barbershopMemberId", onlyBarber._id, {
      dontUpdateMeta: true,
    });
    setSelectedSlotTime(undefined);
  }, [barbers, hideBarberSelector, form]);

  // Reset the chosen slot when the barber or service changes (date reset handled
  // in calendar onSelect). Render-phase adjustment instead of an effect, to
  // avoid an extra render showing the stale slot.
  const slotKey = `${form.state.values.barbershopMemberId ?? ""}|${effectiveServiceId ?? ""}`;
  const [prevSlotKey, setPrevSlotKey] = useState(slotKey);
  if (slotKey !== prevSlotKey) {
    setPrevSlotKey(slotKey);
    setSelectedSlotTime(undefined);
  }

  // Use barber-specific services if available, otherwise fall back to all services
  const displayServices = barberServices ?? services;

  return (
    <form
      id={formIds.form}
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      suppressHydrationWarning
    >
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
                <form.AppField name="customerName">
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={formIds.customerName}>
                        Nombre del cliente
                      </FieldLabel>
                      <Input
                        id={formIds.customerName}
                        value={field.state.value ?? ""}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        aria-invalid={field.state.meta.errors.length > 0}
                        placeholder="Marcos Aguilar"
                        autoComplete="given-name"
                        disabled={disabledFields?.includes("customerName")}
                      />
                      {field.state.meta.errors.length > 0 && (
                        <FieldError
                          errors={field.state.meta.errors.map((e) => ({
                            message: String(e),
                          }))}
                        />
                      )}
                    </Field>
                  )}
                </form.AppField>
              )}

              {showPhoneField && (
                <form.AppField name="contactPhone">
                  {(field) => (
                    <Field data-invalid={field.state.meta.errors.length > 0}>
                      <FieldLabel htmlFor={formIds.contactPhone}>
                        Teléfono de contacto
                      </FieldLabel>
                      <PhoneInput
                        id={formIds.contactPhone}
                        value={field.state.value ?? ""}
                        onChange={field.handleChange}
                        defaultCountry="CO"
                        placeholder="311 987 1234"
                        aria-invalid={field.state.meta.errors.length > 0}
                        disabled={disabledFields?.includes("contactPhone")}
                      />

                      {field.state.meta.errors.length > 0 && (
                        <FieldError
                          errors={field.state.meta.errors.map((e) => ({
                            message: String(e),
                          }))}
                        />
                      )}
                    </Field>
                  )}
                </form.AppField>
              )}
            </div>
          )}
        </div>

        <div
          className={cn("grid gap-4", {
            "grid-cols-2": isBarber,
          })}
        >
          <form.AppField name="contactEmail">
            {(field) => (
              <Field
                data-invalid={field.state.meta.errors.length > 0}
                className={cn({
                  hidden: disabledFields?.includes("contactEmail") || !isBarber,
                  "col-span-2": hideBarberSelector,
                })}
              >
                <FieldLabel htmlFor={formIds.contactEmail}>
                  Email (opcional)
                </FieldLabel>
                <Input
                  id={formIds.contactEmail}
                  value={field.state.value ?? ""}
                  onChange={(e) => field.handleChange(e.target.value)}
                  onBlur={field.handleBlur}
                  aria-invalid={field.state.meta.errors.length > 0}
                  placeholder="cliente@ejemplo.com"
                  autoComplete="email"
                  type="email"
                  disabled={disabledFields?.includes("contactEmail")}
                />
                {field.state.meta.errors.length > 0 && (
                  <FieldError
                    errors={field.state.meta.errors.map((e) => ({
                      message: String(e),
                    }))}
                  />
                )}
              </Field>
            )}
          </form.AppField>

          {hideBarberSelector ? (
            <form.AppField name="barbershopMemberId">
              {(field) => (
                <Input value={field.state.value ?? ""} type="hidden" readOnly />
              )}
            </form.AppField>
          ) : barbers?.length ? (
            <form.AppField name="barbershopMemberId">
              {(field) => (
                <Field data-invalid={field.state.meta.errors.length > 0}>
                  <FieldLabel htmlFor={formIds.barbershopMemberId}>
                    Barbero
                  </FieldLabel>

                  <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                    <Activity mode={barbers?.length > 1 ? "visible" : "hidden"}>
                      <Select
                        value={
                          barbers.find((b) => b._id === field.state.value)?.name
                        }
                        onValueChange={(value) => {
                          const selectedBarber = barbers.find(
                            (barber) => barber.name === value,
                          );

                          if (selectedBarber) {
                            startTransition(() => {
                              field.handleChange(selectedBarber._id);
                              onBarberChange?.(selectedBarber);
                            });
                          }
                        }}
                        aria-invalid={field.state.meta.errors.length > 0}
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
                        id={formIds.barbershopMemberId}
                        value={field.state.value ?? ""}
                        type="hidden"
                        readOnly
                      />
                    </Activity>
                  </Suspense>

                  {field.state.meta.errors.length > 0 && (
                    <FieldError
                      errors={field.state.meta.errors.map((e) => ({
                        message: String(e),
                      }))}
                    />
                  )}
                </Field>
              )}
            </form.AppField>
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

        <form.AppField name="date">
          {(field) => (
            <Field
              data-invalid={field.state.meta.errors.length > 0}
              suppressHydrationWarning
            >
              <FieldLabel htmlFor={formIds.date}>Fecha</FieldLabel>
              <Popover>
                <PopoverTrigger
                  nativeButton
                  render={
                    <Button
                      variant="outline"
                      className={cn(
                        "mb-4 w-full pl-3 text-left font-normal",
                        !field.state.value && "text-muted-foreground",
                      )}
                    >
                      {field.state.value ? (
                        <span
                          className="text-xs sm:text-sm"
                          suppressHydrationWarning
                        >
                          {formatLongDate(field.state.value)}
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
                    selected={toDate(field.state.value)}
                    onSelect={(date) => {
                      if (!date) {
                        field.handleChange(undefined);
                        setSelectedSlotTime(undefined);
                        return;
                      }
                      const combined = startOfDay(date);
                      startTransition(() => {
                        field.handleChange(combined.getTime());
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
              {field.state.meta.errors.length > 0 && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          )}
        </form.AppField>

        <Field>
          <FieldLabel>Hora disponible</FieldLabel>
          <form.Subscribe
            selector={(state) =>
              [state.values.date, state.values.barbershopMemberId] as const
            }
          >
            {([date, barbershopMemberId]) => {
              const canShowSlots = !!(
                date &&
                barbershopMemberId &&
                effectiveServiceId
              );
              // Normalize to midnight so slot selection (which sets hours)
              // doesn't change query params
              const normalizedDate = date
                ? startOfDay(date).getTime()
                : undefined;

              return canShowSlots && normalizedDate ? (
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
                      barbershopMemberId as BarbershopMemberWithName["_id"]
                    }
                    serviceIds={effectiveServiceId ? [effectiveServiceId] : []}
                    date={normalizedDate}
                    value={selectedSlotTime}
                    isPending={isPending}
                    onChange={(slotTime, slotMinutes) => {
                      setSelectedSlotTime(slotTime);
                      const dateObj = dateWithTimeOfDay(
                        normalizedDate,
                        slotMinutes,
                      );
                      form.setFieldValue("date", dateObj.getTime());
                    }}
                  />
                </Suspense>
              ) : (
                <p className="text-muted-foreground text-sm">
                  {!date
                    ? "Selecciona una fecha para ver los horarios."
                    : !barbershopMemberId
                      ? "Selecciona un barbero para ver los horarios."
                      : "Selecciona un servicio para ver los horarios."}
                </p>
              );
            }}
          </form.Subscribe>
        </Field>

        <form.AppField name="notes">
          {(field) => (
            <Field
              data-invalid={field.state.meta.errors.length > 0}
              className="mt-4"
            >
              <FieldLabel htmlFor={formIds.notes}>Notas (opcional)</FieldLabel>
              <Textarea
                id={formIds.notes}
                value={field.state.value ?? ""}
                onChange={(e) => field.handleChange(e.target.value)}
                onBlur={field.handleBlur}
                aria-invalid={field.state.meta.errors.length > 0}
                placeholder="Corte con cero, degradado medio-alto, etc."
                rows={4}
              />
              {field.state.meta.errors.length > 0 && (
                <FieldError
                  errors={field.state.meta.errors.map((e) => ({
                    message: String(e),
                  }))}
                />
              )}
            </Field>
          )}
        </form.AppField>

        {barbers?.length ? (
          <form.AppForm>
            <form.SubmitButton label="Reservar" className="w-full" />
          </form.AppForm>
        ) : (
          <Button type="button" disabled className="w-full">
            Reservar
          </Button>
        )}
      </div>
    </form>
  );
};
