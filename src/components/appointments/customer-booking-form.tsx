import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { formatPhoneNumber } from "@convex/utils";
import { CalendarIcon, ClockIcon } from "@phosphor-icons/react";
import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import type { FC } from "react";
import { Suspense, useEffect, useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppointmentActions,
  useAppointmentFormMetadata,
} from "@/hooks/use-appointments";
import { useBarbersForService } from "@/hooks/use-barbershop-members";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";
import { getConvexErrorMessage } from "@/lib/convex-errors";
import {
  addMinutesToTime,
  validateAppointmentTime,
} from "@/lib/schedule-utils";
import { appointmentFormSchema } from "@/lib/schemas";
import {
  cn,
  dateWithTimeOfDay,
  formatCurrency,
  formatLongDate,
  formatLongDateTime,
  startOfDay,
  toDate,
} from "@/lib/utils";
import { setServiceStore, useServicesStore } from "@/store/services";
import { TimeSlotPicker } from "./time-slot-picker";

interface CustomerBookingFormProps {
  barbershop: Barbershop;
  services: Service[];
  barbers: BarbershopMemberWithName[];
  initialServiceId?: Service["_id"];
}

interface BookingFormValues {
  date: number | undefined;
  customerName: string;
  contactPhone: string;
  contactEmail: string | undefined;
  notes: string;
  barbershopMemberId: BarbershopMemberWithName["_id"] | undefined;
}

export const CustomerBookingForm: FC<CustomerBookingFormProps> = ({
  barbershop,
  services,
  barbers,
  initialServiceId,
}) => {
  const barbershopUuid = barbershop.uuid;
  const navigate = useNavigate();
  const haptic = useWebHaptics();

  const formIds = {
    date: useId(),
    contactPhone: useId(),
    alternateContactPhone: useId(),
    contactEmail: useId(),
    notes: useId(),
    barbershopMemberId: useId(),
    serviceId: useId(),
    summarySection: useId(),
  };

  const { data: user } = useSession();
  // biome-ignore lint/style/noNonNullAssertion: profile data is preloaded for authenticated booking routes
  const { data: userProfile } = useProfile(user?.id!);

  const storeService = useServicesStore();
  const effectiveServiceId = (storeService._id || initialServiceId) as
    | Service["_id"]
    | undefined;

  // biome-ignore lint/style/noNonNullAssertion: query is only consumed when a service is selected
  const { data: barbersForService } = useBarbersForService(effectiveServiceId!);

  const availableBarbers = effectiveServiceId
    ? (barbersForService ?? barbers)
    : barbers;

  const {
    createAppointment: {
      mutateAsync: createAppointment,
      isPending: isCreatingAppointment,
    },
  } = useAppointmentActions();

  const { scheduleForDate, disableDay } = useAppointmentFormMetadata(
    barbershop._id,
  );

  const profilePhone = userProfile?.phoneNumber
    ? formatPhoneNumber(userProfile.phoneNumber)
    : "";
  const profileEmail = userProfile?.email?.trim() ?? "";
  const [useAlternatePhone, setUseAlternatePhone] = useState(false);
  const [useAlternateEmail, setUseAlternateEmail] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | undefined>(
    undefined,
  );

  const defaultValues: BookingFormValues = {
    date: undefined,
    customerName: userProfile?.name ?? "",
    contactPhone: profilePhone,
    contactEmail: profileEmail || undefined,
    notes: "",
    barbershopMemberId:
      availableBarbers?.length === 1 ? availableBarbers[0]?._id : undefined,
  };

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
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
      const { date, barbershopMemberId } = value;

      if (date === undefined || !barbershopMemberId || !effectiveServiceId) {
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
            contactPhone: value.contactPhone,
            contactEmail: value.contactEmail?.trim() || undefined,
            notes: value.notes,
            barbershopId: barbershop._id,
            barbershopMemberId,
            serviceId: effectiveServiceId,
            isStaffCreated: false,
          },
        });

        resetBookingForm();
        haptic.trigger("success");

        toast.custom(
          (toastId) => (
            <div className="flex flex-col gap-3 rounded-lg border bg-background p-4 shadow-lg">
              <p className="font-semibold">¡Cita reservada exitosamente!</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    toast.dismiss(toastId);
                    navigate({
                      to: "/barbershops/$barbershopUuid",
                      params: { barbershopUuid },
                    });
                  }}
                >
                  Volver a la barbería
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    toast.dismiss(toastId);
                    navigate({
                      to: "/profile",
                      search: (prev) => ({ ...prev, tab: "appointments" }),
                    });
                  }}
                >
                  Ver mis citas
                </Button>
              </div>
            </div>
          ),
          { duration: Number.POSITIVE_INFINITY },
        );
      } catch (error) {
        haptic.trigger("error");
        toast.error(getConvexErrorMessage(error));
      }
    },
  });

  const resetBookingForm = () => {
    setUseAlternatePhone(false);
    setUseAlternateEmail(false);
    setSelectedSlotTime(undefined);
    form.reset(defaultValues);
  };

  useEffect(() => {
    if (!profilePhone || useAlternatePhone) {
      return;
    }
    form.setFieldValue("contactPhone", profilePhone, { dontUpdateMeta: true });
  }, [profilePhone, useAlternatePhone, form]);

  useEffect(() => {
    if (!profileEmail || useAlternateEmail) {
      return;
    }
    form.setFieldValue("contactEmail", profileEmail, { dontUpdateMeta: true });
  }, [profileEmail, useAlternateEmail, form]);

  // Auto-select when the available barber list narrows to exactly 1
  useEffect(() => {
    if (availableBarbers?.length !== 1) {
      return;
    }
    const onlyBarberId = availableBarbers[0]?._id;
    if (
      !onlyBarberId ||
      form.state.values.barbershopMemberId === onlyBarberId
    ) {
      return;
    }
    form.setFieldValue("barbershopMemberId", onlyBarberId, {
      dontUpdateMeta: true,
    });
    setSelectedSlotTime(undefined);
  }, [availableBarbers, form]);

  const effectiveService = services.find((s) => s._id === effectiveServiceId);

  // Reset the chosen slot when the service changes. Done as a render-phase
  // adjustment (not an effect) so there's no extra render showing the stale
  // slot against the new service. Barber changes reset the slot at the point
  // of change (select handler / auto-select effect).
  const [prevServiceId, setPrevServiceId] = useState(effectiveServiceId);
  if (effectiveServiceId !== prevServiceId) {
    setPrevServiceId(effectiveServiceId);
    setSelectedSlotTime(undefined);
  }

  const pendingLabel = "Pendiente";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-6"
      suppressHydrationWarning
    >
      <section
        aria-labelledby="booking-service-heading"
        className="grid grid-cols-1 gap-4 md:grid-cols-2"
      >
        <div className="flex flex-col gap-2">
          <h2
            id="booking-service-heading"
            className="font-semibold text-foreground text-sm"
          >
            Servicio
          </h2>
          <Field>
            <FieldLabel htmlFor={formIds.serviceId} className="sr-only">
              Servicio
            </FieldLabel>

            {services.length === 0 ? (
              <span className="text-muted-foreground text-sm">
                No hay servicios disponibles.
              </span>
            ) : (
              <Suspense fallback={<Skeleton className="h-11 w-full" />}>
                <Select
                  value={effectiveServiceId}
                  onValueChange={(value) => {
                    const match = services.find(
                      (s) => String(s._id) === String(value),
                    );
                    if (match) {
                      startTransition(() => {
                        setServiceStore({ service: match });
                      });
                    }
                  }}
                >
                  <SelectTrigger id={formIds.serviceId} className="h-11 w-full">
                    <SelectValue placeholder="Seleccionar servicio...">
                      {effectiveServiceId
                        ? (services.find(
                            (s) => String(s._id) === String(effectiveServiceId),
                          )?.name ?? "Servicio no disponible")
                        : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service._id} value={service._id}>
                        <div className="flex w-full items-center justify-between gap-2">
                          <span className="font-medium">{service.name}</span>
                          <div className="flex flex-col items-end text-muted-foreground text-xs">
                            <span>{formatCurrency(service.price)}</span>
                            <span>{service.duration} min</span>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Suspense>
            )}
            {effectiveService && (
              <div className="flex flex-wrap gap-2 pt-2">
                <Badge variant="secondary">
                  {formatCurrency(effectiveService.price)}
                </Badge>
                <Badge variant="outline">{effectiveService.duration} min</Badge>
              </div>
            )}
          </Field>
        </div>

        <form.AppField name="barbershopMemberId">
          {(field) => {
            const isInvalid = field.state.meta.errors.length > 0;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={formIds.barbershopMemberId}>
                  Barbero
                </FieldLabel>

                {availableBarbers?.length === 0 ? (
                  <span className="text-muted-foreground text-sm">
                    No hay barberos disponibles para este servicio.
                  </span>
                ) : availableBarbers?.length === 1 ? (
                  <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                    <Avatar size="default">
                      <AvatarFallback>
                        {availableBarbers[0]?.name?.slice(0, 2).toUpperCase() ??
                          "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                      {availableBarbers[0]?.name}
                    </span>
                  </div>
                ) : (
                  <Suspense fallback={<Skeleton className="h-11 w-full" />}>
                    <Select
                      value={field.state.value}
                      onValueChange={(value) => {
                        startTransition(() => {
                          field.handleChange(
                            value as BarbershopMemberWithName["_id"],
                          );
                          setSelectedSlotTime(undefined);
                        });
                      }}
                      aria-invalid={isInvalid}
                    >
                      <SelectTrigger
                        id={formIds.barbershopMemberId}
                        className="h-11 w-full"
                      >
                        <SelectValue placeholder="Selecciona un barbero">
                          {field.state.value
                            ? (availableBarbers?.find(
                                (b) =>
                                  String(b?._id) === String(field.state.value),
                              )?.name ?? "Barbero no disponible")
                            : undefined}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableBarbers?.map((barber) => (
                          <SelectItem key={barber?._id} value={barber?._id}>
                            <div className="flex items-center gap-2">
                              <Avatar size="sm">
                                <AvatarFallback>
                                  {barber?.name.slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              {barber?.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Suspense>
                )}

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.AppField>
      </section>

      <Separator />

      <section aria-labelledby="booking-contact-heading" className="space-y-4">
        <h2
          id="booking-contact-heading"
          className="font-semibold text-foreground text-sm"
        >
          Contacto
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <form.AppField name="contactPhone">
            {(field) => {
              const hasSavedPhone = Boolean(profilePhone);
              const phoneDisabled = hasSavedPhone && !useAlternatePhone;
              const isInvalid = field.state.meta.errors.length > 0;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={formIds.contactPhone}>
                    Teléfono
                  </FieldLabel>
                  <PhoneInput
                    id={formIds.contactPhone}
                    value={field.state.value}
                    onChange={field.handleChange}
                    defaultCountry="CO"
                    placeholder="311 987 1234"
                    disabled={phoneDisabled}
                    aria-invalid={isInvalid}
                  />
                  {hasSavedPhone ? (
                    <div className="mt-2 flex gap-2">
                      <Checkbox
                        id={formIds.alternateContactPhone}
                        className="mt-0.5"
                        checked={useAlternatePhone}
                        onCheckedChange={(checked) => {
                          const useAlt = checked === true;
                          setUseAlternatePhone(useAlt);
                          field.handleChange(useAlt ? "" : profilePhone);
                        }}
                        disabled={isCreatingAppointment}
                      />
                      <FieldLabel
                        htmlFor={formIds.alternateContactPhone}
                        className="font-normal text-muted-foreground text-sm leading-snug"
                      >
                        Usar otro número solo para esta reserva
                      </FieldLabel>
                    </div>
                  ) : null}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.AppField>
          <form.AppField name="contactEmail">
            {(field) => {
              const hasSavedEmail = Boolean(profileEmail);
              const emailDisabled = hasSavedEmail && !useAlternateEmail;
              const isInvalid = field.state.meta.errors.length > 0;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={formIds.contactEmail}>Correo</FieldLabel>
                  <Input
                    id={formIds.contactEmail}
                    type="email"
                    value={field.state.value ?? ""}
                    onChange={(e) =>
                      field.handleChange(
                        e.target.value.trim() === ""
                          ? undefined
                          : e.target.value,
                      )
                    }
                    placeholder="tu@correo.com"
                    disabled={emailDisabled}
                    aria-invalid={isInvalid}
                  />
                  {hasSavedEmail ? (
                    <div className="mt-2 flex gap-2">
                      <Checkbox
                        id={`${formIds.contactEmail}-alternate`}
                        className="mt-0.5"
                        checked={useAlternateEmail}
                        onCheckedChange={(checked) => {
                          const useAlt = checked === true;
                          setUseAlternateEmail(useAlt);
                          field.handleChange(
                            useAlt ? undefined : profileEmail || undefined,
                          );
                        }}
                        disabled={isCreatingAppointment}
                      />
                      <FieldLabel
                        htmlFor={`${formIds.contactEmail}-alternate`}
                        className="font-normal text-muted-foreground text-sm leading-snug"
                      >
                        Usar otro correo solo para esta reserva
                      </FieldLabel>
                    </div>
                  ) : null}
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.AppField>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="booking-schedule-heading" className="space-y-4">
        <h2
          id="booking-schedule-heading"
          className="font-semibold text-foreground text-sm"
        >
          Fecha y hora
        </h2>

        <div className="grid gap-6 lg:grid-cols-2 lg:gap-8">
          <form.AppField name="date">
            {(field) => {
              const isInvalid = field.state.meta.errors.length > 0;

              return (
                <Field data-invalid={isInvalid} suppressHydrationWarning>
                  <FieldLabel htmlFor={formIds.date}>Día</FieldLabel>
                  <Popover>
                    <PopoverTrigger
                      nativeButton={false}
                      render={
                        <Button
                          type="button"
                          variant="outline"
                          className={cn(
                            "h-11 w-full justify-start pl-3 text-left font-normal",
                            !field.state.value && "text-muted-foreground",
                          )}
                        >
                          {field.state.value ? (
                            <span className="text-sm" suppressHydrationWarning>
                              {formatLongDate(field.state.value)}
                            </span>
                          ) : (
                            <span className="text-sm">
                              Selecciona una fecha
                            </span>
                          )}
                          <CalendarIcon className="ml-auto size-4 opacity-50" />
                        </Button>
                      }
                    />
                    <PopoverContent
                      className="w-auto p-0"
                      align="start"
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
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.AppField>

          <form.AppField name="date">
            {(dateField) => (
              <Field>
                <FieldLabel className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 opacity-70" />
                  Hora
                </FieldLabel>
                <form.Subscribe
                  selector={(state) => state.values.barbershopMemberId}
                >
                  {(barberId) => {
                    const dateValue = dateField.state.value;
                    const normalizedDate = dateValue
                      ? startOfDay(dateValue).getTime()
                      : undefined;

                    if (
                      dateValue &&
                      normalizedDate &&
                      barberId &&
                      effectiveServiceId
                    ) {
                      return (
                        <Suspense
                          fallback={
                            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
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
                            barbershopId={barbershop._id}
                            barbershopMemberId={barberId}
                            serviceId={effectiveServiceId}
                            date={normalizedDate}
                            value={selectedSlotTime}
                            isPending={isPending}
                            onChange={(slotTime, slotMinutes) => {
                              setSelectedSlotTime(slotTime);
                              const dateObj = dateWithTimeOfDay(
                                normalizedDate,
                                slotMinutes,
                              );
                              dateField.handleChange(dateObj.getTime());
                            }}
                          />
                        </Suspense>
                      );
                    }

                    const emptySlotHint = !dateValue
                      ? "Selecciona una fecha para ver los horarios disponibles."
                      : !barberId
                        ? "Elige un barbero para cargar sus horarios."
                        : "Elige un servicio para ver la disponibilidad.";

                    return (
                      <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-6 text-center">
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {emptySlotHint}
                        </p>
                      </div>
                    );
                  }}
                </form.Subscribe>
              </Field>
            )}
          </form.AppField>
        </div>
      </section>

      <Separator />

      <section aria-labelledby="booking-notes-heading" className="space-y-3">
        <h2
          id="booking-notes-heading"
          className="font-semibold text-foreground text-sm"
        >
          Notas para el barbero{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </h2>
        <form.AppField name="notes">
          {(field) => {
            const isInvalid = field.state.meta.errors.length > 0;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={formIds.notes} className="sr-only">
                  Notas
                </FieldLabel>
                <Textarea
                  id={formIds.notes}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Ej.: corte con cero, degradado medio-alto, poco producto…"
                  rows={3}
                  className="min-h-22 resize-y"
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        </form.AppField>
      </section>

      <Separator />

      <section aria-labelledby={formIds.summarySection} className="space-y-4">
        <div className="space-y-1">
          <h2
            id={formIds.summarySection}
            className="font-semibold text-foreground text-sm"
          >
            Revisa tu reserva
          </h2>
          <p className="text-muted-foreground text-xs">
            Confirma que los datos sean correctos antes de enviar la solicitud.
          </p>
        </div>
        <form.Subscribe
          selector={(state) =>
            [
              state.values.date,
              state.values.barbershopMemberId,
              state.values.customerName,
              state.values.contactPhone,
              state.values.contactEmail,
              state.values.notes,
            ] as const
          }
        >
          {([
            date,
            barberId,
            customerName,
            contactPhone,
            contactEmail,
            notes,
          ]) => {
            const selectedBarberName =
              availableBarbers?.find((b) => b?._id === barberId)?.name ?? null;

            const appointmentDateTimeLabel =
              date !== undefined ? formatLongDateTime(date) : null;

            const timeRangeLabel =
              selectedSlotTime && effectiveService
                ? `${selectedSlotTime} – ${addMinutesToTime(
                    selectedSlotTime,
                    effectiveService.duration,
                  )} (${effectiveService.duration} min)`
                : null;

            const phoneSummaryRaw = contactPhone?.trim() ?? "";
            const phoneSummaryLabel =
              phoneSummaryRaw === ""
                ? null
                : formatPhoneNumber(phoneSummaryRaw) || phoneSummaryRaw;

            return (
              <Card size="sm" className="shadow-none ring-border/80">
                <CardContent className="grid gap-4 pt-2 pb-4 sm:grid-cols-2">
                  <div className="min-w-0 sm:col-span-2">
                    <CardDescription className="text-xs">
                      Barbería
                    </CardDescription>
                    <p className="mt-0.5 font-medium text-foreground text-sm">
                      {barbershop.name}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <CardDescription className="text-xs">
                      Servicio
                    </CardDescription>
                    <p
                      className={cn(
                        "mt-0.5 text-sm",
                        effectiveService
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {effectiveService
                        ? `${effectiveService.name} · ${formatCurrency(effectiveService.price)} · ${effectiveService.duration} min`
                        : pendingLabel}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <CardDescription className="text-xs">
                      Barbero
                    </CardDescription>
                    <p
                      className={cn(
                        "mt-0.5 text-sm",
                        selectedBarberName
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {selectedBarberName ?? pendingLabel}
                    </p>
                  </div>
                  <div className="min-w-0 sm:col-span-2">
                    <CardDescription className="text-xs">
                      Fecha y hora
                    </CardDescription>
                    <p
                      className={cn(
                        "mt-0.5 text-sm",
                        appointmentDateTimeLabel
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                      suppressHydrationWarning
                    >
                      {appointmentDateTimeLabel ?? pendingLabel}
                    </p>
                    {timeRangeLabel ? (
                      <p className="mt-1 text-muted-foreground text-xs">
                        Franja: {timeRangeLabel}
                      </p>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <CardDescription className="text-xs">
                      Cliente
                    </CardDescription>
                    <p
                      className={cn(
                        "mt-0.5 text-sm",
                        customerName?.trim()
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {customerName?.trim() || pendingLabel}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <CardDescription className="text-xs">
                      Teléfono
                    </CardDescription>
                    <p
                      className={cn(
                        "mt-0.5 break-all text-sm",
                        phoneSummaryLabel
                          ? "font-medium text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {phoneSummaryLabel ?? pendingLabel}
                    </p>
                  </div>
                  {contactEmail?.trim() ? (
                    <div className="min-w-0 sm:col-span-2">
                      <CardDescription className="text-xs">
                        Correo
                      </CardDescription>
                      <p className="mt-0.5 break-all font-medium text-foreground text-sm">
                        {contactEmail.trim()}
                      </p>
                    </div>
                  ) : null}
                  {notes?.trim() ? (
                    <div className="min-w-0 sm:col-span-2">
                      <CardDescription className="text-xs">
                        Notas para el barbero
                      </CardDescription>
                      <p className="mt-0.5 whitespace-pre-wrap text-foreground text-sm">
                        {notes.trim()}
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          }}
        </form.Subscribe>
      </section>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="sm:min-w-36"
          onClick={() => {
            resetBookingForm();
            navigate({
              to: "/barbershops/$barbershopUuid",
              params: { barbershopUuid },
            });
          }}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={
            isCreatingAppointment || !availableBarbers?.length || !user?.id
          }
          className="sm:min-w-44"
        >
          {isCreatingAppointment && <Spinner />}
          Confirmar cita
        </Button>
      </div>

      {!user?.id && (
        <p className="text-right text-muted-foreground text-sm">
          Para reservar una cita, debes iniciar sesión.
        </p>
      )}
    </form>
  );
};
