import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { formatPhoneNumber } from "@convex/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, ClockIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { es } from "date-fns/locale";
import type { FC } from "react";
import { Suspense, useEffect, useId, useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

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
import { cn, formatCurrency } from "@/lib/utils";
import { setServiceStore, useServicesStore } from "@/store/services";
import { TimeSlotPicker } from "./time-slot-picker";

interface CustomerBookingFormProps {
  barbershop: Barbershop;
  services: Service[];
  barbers: BarbershopMemberWithName[];
  initialServiceId?: Service["_id"];
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
    form: useId(),
    customerName: useId(),
    date: useId(),
    startTime: useId(),
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
  const { data: userProfile } = useProfile(user?.userId!);

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

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: userProfile?.name,
      contactPhone: profilePhone,
      contactEmail: profileEmail || undefined,
      notes: "",
      barbershopMemberId:
        availableBarbers?.length === 1 ? availableBarbers[0]?._id : undefined,
    },
  });

  useEffect(() => {
    if (!profilePhone || useAlternatePhone) {
      return;
    }
    form.setValue("contactPhone", profilePhone);
  }, [profilePhone, useAlternatePhone, form]);

  useEffect(() => {
    if (!profileEmail || useAlternateEmail) {
      return;
    }
    form.setValue("contactEmail", profileEmail);
  }, [profileEmail, useAlternateEmail, form]);

  // Auto-select when the available barber list narrows to exactly 1
  useEffect(() => {
    if (availableBarbers?.length === 1) {
      form.setValue("barbershopMemberId", availableBarbers[0]?._id);
    }
  }, [availableBarbers, form]);

  const [isPending, startTransition] = useTransition();
  const [selectedSlotTime, setSelectedSlotTime] = useState<string | undefined>(
    undefined,
  );
  const watchedDate = form.watch("date") as number | undefined;
  const watchedBarber = form.watch("barbershopMemberId") as string | undefined;
  const watchedCustomerName = form.watch("customerName");
  const watchedContactPhone = form.watch("contactPhone");
  const watchedContactEmail = form.watch("contactEmail");
  const watchedNotes = form.watch("notes");

  const canShowSlots = !!(watchedDate && watchedBarber && effectiveServiceId);
  const normalizedDate = watchedDate
    ? new Date(watchedDate).setHours(0, 0, 0, 0)
    : undefined;

  const effectiveService = services.find((s) => s._id === effectiveServiceId);

  // Reset slot when barber or service changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reset
  useEffect(() => {
    setSelectedSlotTime(undefined);
  }, [watchedBarber, effectiveServiceId]);

  const onSubmit = form.handleSubmit(async (formData) => {
    const schedule = scheduleForDate(formData.date);
    const validation = validateAppointmentTime(schedule, formData.date);

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    try {
      await createAppointment({
        appointment: {
          ...formData,
          contactPhone: formData.contactPhone,
          contactEmail: formData.contactEmail?.trim() || undefined,
          barbershopId: barbershop._id,
          barbershopMemberId: formData.barbershopMemberId,
          serviceId: effectiveServiceId,
          isStaffCreated: false,
        },
      });

      setUseAlternatePhone(false);
      setUseAlternateEmail(false);
      form.reset({
        date: undefined,
        customerName: userProfile?.name,
        contactPhone: profilePhone,
        contactEmail: profileEmail || undefined,
        notes: "",
        barbershopMemberId:
          availableBarbers?.length === 1 ? availableBarbers[0]?._id : undefined,
      });
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
  });

  const emptySlotHint = !watchedDate
    ? "Selecciona una fecha para ver los horarios disponibles."
    : !watchedBarber
      ? "Elige un barbero para cargar sus horarios."
      : "Elige un servicio para ver la disponibilidad.";

  const selectedBarberName =
    availableBarbers?.find((b) => b?._id === watchedBarber)?.name ?? null;

  const appointmentDateTimeLabel =
    watchedDate !== undefined
      ? new Date(watchedDate).toLocaleString("es-CO", {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const timeRangeLabel =
    selectedSlotTime && effectiveService
      ? `${selectedSlotTime} – ${addMinutesToTime(
          selectedSlotTime,
          effectiveService.duration,
        )} (${effectiveService.duration} min)`
      : null;

  const phoneSummaryRaw = watchedContactPhone?.trim() ?? "";
  const phoneSummaryLabel =
    phoneSummaryRaw === ""
      ? null
      : formatPhoneNumber(phoneSummaryRaw) || phoneSummaryRaw;

  const pendingLabel = "Pendiente";

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-10">
      {/* Hidden fields for pre-filled customer data */}
      <Controller
        name="customerName"
        control={form.control}
        render={({ field }) => <Input {...field} type="hidden" />}
      />

      <section
        aria-labelledby="booking-service-heading"
        className="grid gap-6 lg:grid-cols-2 lg:gap-8"
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

        <Controller
          name="barbershopMemberId"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.barbershopMemberId}>
                Barbero
              </FieldLabel>

              {availableBarbers?.length === 0 ? (
                <span className="text-muted-foreground text-sm">
                  No hay barberos disponibles para este servicio.
                </span>
              ) : availableBarbers?.length === 1 ? (
                <>
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
                  <Input {...field} type="hidden" />
                </>
              ) : (
                <Suspense fallback={<Skeleton className="h-11 w-full" />}>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      startTransition(() => {
                        field.onChange(value);
                      });
                    }}
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectTrigger
                      id={formIds.barbershopMemberId}
                      className="h-11 w-full"
                    >
                      <SelectValue placeholder="Selecciona un barbero">
                        {field.value
                          ? (availableBarbers?.find(
                              (b) => String(b?._id) === String(field.value),
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

              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
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
          <Controller
            name="contactPhone"
            control={form.control}
            render={({ field, fieldState }) => {
              const hasSavedPhone = Boolean(profilePhone);
              const phoneDisabled = hasSavedPhone && !useAlternatePhone;

              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formIds.contactPhone}>
                    Teléfono
                  </FieldLabel>
                  <PhoneInput
                    id={formIds.contactPhone}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    defaultCountry="CO"
                    placeholder="311 987 1234"
                    disabled={phoneDisabled}
                    aria-invalid={fieldState.invalid}
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
                          if (useAlt) {
                            form.setValue("contactPhone", "");
                          } else {
                            form.setValue("contactPhone", profilePhone);
                          }
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />
          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => {
              const hasSavedEmail = Boolean(profileEmail);
              const emailDisabled = hasSavedEmail && !useAlternateEmail;

              return (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formIds.contactEmail}>Correo</FieldLabel>
                  <Input
                    id={formIds.contactEmail}
                    type="email"
                    value={field.value ?? ""}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value.trim() === ""
                          ? undefined
                          : e.target.value,
                      )
                    }
                    placeholder="tu@correo.com"
                    disabled={emailDisabled}
                    aria-invalid={fieldState.invalid}
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
                          if (useAlt) {
                            form.setValue("contactEmail", undefined, {
                              shouldValidate: true,
                            });
                          } else {
                            form.setValue(
                              "contactEmail",
                              profileEmail || undefined,
                              { shouldValidate: true },
                            );
                          }
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              );
            }}
          />
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
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.date}>Día</FieldLabel>
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "h-11 w-full justify-start pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          <span className="text-sm">
                            {new Date(field.value as number).toLocaleDateString(
                              "es-CO",
                              {
                                day: "2-digit",
                                month: "long",
                                year: "numeric",
                              },
                            )}
                          </span>
                        ) : (
                          <span className="text-sm">Selecciona una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto size-4 opacity-50" />
                      </Button>
                    }
                  />
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={
                        field.value
                          ? new Date(field.value as number)
                          : undefined
                      }
                      onSelect={(date) => {
                        if (!date) {
                          field.onChange(undefined);
                          setSelectedSlotTime(undefined);
                          return;
                        }
                        const combined = new Date(date);
                        combined.setHours(0, 0, 0, 0);
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field>
            <FieldLabel className="inline-flex items-center gap-1.5">
              <ClockIcon className="size-3.5 opacity-70" />
              Hora
            </FieldLabel>
            {canShowSlots && normalizedDate ? (
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
                  barbershopMemberId={
                    watchedBarber as BarbershopMemberWithName["_id"]
                  }
                  serviceId={effectiveServiceId}
                  date={normalizedDate}
                  value={selectedSlotTime}
                  isPending={isPending}
                  onChange={(slotTime, slotMinutes) => {
                    setSelectedSlotTime(slotTime);
                    const dateObj = new Date(normalizedDate);
                    const hours = Math.floor(slotMinutes / 60);
                    const minutes = slotMinutes % 60;
                    dateObj.setHours(hours, minutes, 0, 0);
                    form.setValue("date", dateObj.getTime(), {
                      shouldValidate: true,
                    });
                  }}
                />
              </Suspense>
            ) : (
              <div className="rounded-lg border border-border/60 bg-background/50 px-3 py-6 text-center">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {emptySlotHint}
                </p>
              </div>
            )}
          </Field>
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
        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.notes} className="sr-only">
                Notas
              </FieldLabel>
              <Textarea
                {...field}
                id={formIds.notes}
                aria-invalid={fieldState.invalid}
                placeholder="Ej.: corte con cero, degradado medio-alto, poco producto…"
                rows={3}
                className="min-h-22 resize-y"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </section>

      <Separator />

      <section aria-labelledby={formIds.summarySection} className="space-y-3">
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
        <Card size="sm" className="shadow-none ring-border/80">
          <CardContent className="grid gap-4 pt-2 pb-4 sm:grid-cols-2">
            <div className="min-w-0 sm:col-span-2">
              <CardDescription className="text-xs">Barbería</CardDescription>
              <p className="mt-0.5 font-medium text-foreground text-sm">
                {barbershop.name}
              </p>
            </div>
            <div className="min-w-0">
              <CardDescription className="text-xs">Servicio</CardDescription>
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
              <CardDescription className="text-xs">Barbero</CardDescription>
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
              <CardDescription className="text-xs">Cliente</CardDescription>
              <p
                className={cn(
                  "mt-0.5 text-sm",
                  watchedCustomerName?.trim()
                    ? "font-medium text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {watchedCustomerName?.trim() || pendingLabel}
              </p>
            </div>
            <div className="min-w-0">
              <CardDescription className="text-xs">Teléfono</CardDescription>
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
            {watchedContactEmail?.trim() ? (
              <div className="min-w-0 sm:col-span-2">
                <CardDescription className="text-xs">Correo</CardDescription>
                <p className="mt-0.5 break-all font-medium text-foreground text-sm">
                  {watchedContactEmail.trim()}
                </p>
              </div>
            ) : null}
            {watchedNotes?.trim() ? (
              <div className="min-w-0 sm:col-span-2">
                <CardDescription className="text-xs">
                  Notas para el barbero
                </CardDescription>
                <p className="mt-0.5 whitespace-pre-wrap text-foreground text-sm">
                  {watchedNotes.trim()}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          className="sm:min-w-36"
          onClick={() => {
            setUseAlternatePhone(false);
            setUseAlternateEmail(false);
            form.reset({
              date: undefined,
              customerName: userProfile?.name,
              contactPhone: profilePhone,
              contactEmail: profileEmail || undefined,
              notes: "",
              barbershopMemberId:
                availableBarbers?.length === 1
                  ? availableBarbers[0]?._id
                  : undefined,
            });
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
          form={formIds.form}
          disabled={isCreatingAppointment || !availableBarbers?.length}
          className="sm:min-w-44"
        >
          {isCreatingAppointment && <Spinner />}
          Confirmar cita
        </Button>
      </div>
    </form>
  );
};
