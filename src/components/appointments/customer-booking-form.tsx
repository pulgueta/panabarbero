import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@convex/schema";
import { formatPhoneNumber } from "@convex/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarIcon,
  CaretUpDownIcon,
  CheckIcon,
  ClockIcon,
} from "@phosphor-icons/react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
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
  };

  const { data: user } = useSession();
  const { data: userProfile } = useProfile(user?.userId!);

  const storeService = useServicesStore();
  const effectiveServiceId = (storeService._id || initialServiceId) as
    | Service["_id"]
    | undefined;

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

  const [useAlternatePhone, setUseAlternatePhone] = useState(false);

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: userProfile?.name,
      contactPhone: profilePhone,
      contactEmail: userProfile?.email,
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
  const [serviceOpen, setServiceOpen] = useState(false);

  const watchedDate = form.watch("date") as number | undefined;
  const watchedBarber = form.watch("barbershopMemberId") as string | undefined;

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
          barbershopId: barbershop._id,
          barbershopMemberId: formData.barbershopMemberId,
          serviceId: effectiveServiceId,
          isStaffCreated: false,
        },
      });

      setUseAlternatePhone(false);
      form.reset({
        date: undefined,
        customerName: userProfile?.name,
        contactPhone: profilePhone,
        contactEmail: userProfile?.email,
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

  return (
    <form id={formIds.form} onSubmit={onSubmit} className="space-y-10">
      {/* Hidden fields for pre-filled customer data */}
      <Controller
        name="customerName"
        control={form.control}
        render={({ field }) => <Input {...field} type="hidden" />}
      />
      <Controller
        name="contactEmail"
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
            <FieldLabel className="sr-only">Servicio</FieldLabel>

            <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
              <PopoverTrigger
                render={
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={serviceOpen}
                    className="h-11 w-full justify-between px-3 text-left font-normal"
                  >
                    {effectiveService
                      ? effectiveService.name
                      : "Seleccionar servicio..."}
                    <CaretUpDownIcon className="size-4 shrink-0 opacity-50" />
                  </Button>
                }
              />
              <PopoverContent className="w-[min(100vw-2rem,var(--radix-popover-trigger-width))] p-0 sm:w-(--radix-popover-trigger-width)">
                <Command>
                  <CommandInput
                    placeholder="Buscar servicio..."
                    className="h-9"
                  />
                  <CommandList>
                    <CommandEmpty>No se encontraron servicios.</CommandEmpty>
                    <CommandGroup>
                      {services.map((service) => (
                        <CommandItem
                          key={service._id}
                          value={service._id}
                          onSelect={(value) => {
                            const match = services.find((s) => s._id === value);
                            if (match) setServiceStore({ service: match });
                            setServiceOpen(false);
                          }}
                        >
                          <div className="flex w-full items-center justify-between gap-2">
                            <span className="font-medium">{service.name}</span>
                            <div className="flex flex-col items-end text-muted-foreground text-xs">
                              <span>{formatCurrency(service.price)}</span>
                              <span>{service.duration} min</span>
                            </div>
                          </div>
                          <CheckIcon
                            className={cn(
                              "ml-2 size-3 shrink-0",
                              effectiveServiceId === service._id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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
                      <SelectValue placeholder="Selecciona un barbero" />
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
        <div className="space-y-4" id="booking-contact-heading">
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
                        Usar otro número solo para esta reserva (no se guarda en
                        tu perfil)
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

            {selectedSlotTime && effectiveService && (
              <p className="mt-3 rounded-md bg-primary/5 px-3 py-2 text-foreground text-sm">
                <span className="font-medium">Resumen: </span>
                {selectedSlotTime} –{" "}
                {addMinutesToTime(selectedSlotTime, effectiveService.duration)}{" "}
                <span className="text-muted-foreground">
                  ({effectiveService.duration} min)
                </span>
              </p>
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

      <div className="flex flex-col-reverse gap-3 border-border/80 border-t pt-6 sm:flex-row sm:justify-end sm:gap-3">
        <Button
          type="button"
          variant="outline"
          className="sm:min-w-36"
          onClick={() => {
            setUseAlternatePhone(false);
            form.reset({
              date: undefined,
              customerName: userProfile?.name,
              contactPhone: profilePhone,
              contactEmail: userProfile?.email,
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
