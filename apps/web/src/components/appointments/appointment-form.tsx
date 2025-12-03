import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "@panabarbero/convex/schemas";
import { Link, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, ChevronRightIcon, Clock8Icon, Info } from "lucide-react";
import type { FC } from "react";
import { useCallback, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
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
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useBarbershopAvailability } from "@/hooks/barbershop/use-barbershop";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useBarbersByBarbershopId } from "@/hooks/use-barbers";
import { useServicesFromBarbershop } from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";
import type { AppointmentFormData } from "@/lib/schemas";
import { appointmentFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { useServicesStore } from "@/store/services";
import { ServicesDropdown } from "../barbershops/services/services-dropdown";

type WeekdayKey =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

interface AppointmentFormProps {
  service: Service;
  initialValues?: Partial<AppointmentFormData>;
}

export const AppointmentForm: FC<AppointmentFormProps> = ({
  service,
  initialValues,
}) => {
  const formIds = {
    customerName: useId(),
    date: useId(),
    startTime: useId(),
    contactPhone: useId(),
    contactEmail: useId(),
    notes: useId(),
    form: useId(),
    barberId: useId(),
    serviceId: useId(),
  };

  const navigate = useNavigate();

  const { data: user } = useSession();

  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(service.barbershopId);
  const { data: availability } = useBarbershopAvailability(
    service.barbershopId,
  );
  const { data: services } = useServicesFromBarbershop(service.barbershopId);
  const { service: selectedService } = useServicesStore();
  const {
    createAppointment: { mutateAsync: createAppointment, isPending },
  } = useAppointmentActions();

  const { captureEvent } = useAnalytics();

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: undefined,
      customerName: initialValues?.customerName ?? user?.name,
      contactPhone: initialValues?.contactPhone ?? user?.phoneNumber ?? "",
      contactEmail: initialValues?.contactEmail ?? user?.email,
      notes: "",
      barberId:
        barbers?.length && barbers?.length > 1 ? undefined : barbers?.[0]._id,
    },
  });

  const dayIndexes: Record<WeekdayKey, number> = Object.freeze({
    sunday: 0,
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
  });

  const activeDays = new Set(
    availability
      ?.filter((d) => d.weekDay?.isActive)
      .map((d) => dayIndexes[d.weekDay.day as WeekdayKey]) ?? [],
  );

  const disableDay = useCallback(
    (day: Date): boolean => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const currentDay = new Date(day);
      currentDay.setHours(0, 0, 0, 0);

      const weekday = currentDay.getDay();

      if (currentDay < today) return true;

      if (!activeDays.has(weekday)) return true;

      return false;
    },
    [activeDays],
  );

  const timeStringToMinutes = (value?: string | null) => {
    if (!value) return null;
    const [hours, minutes] = value.split(":").map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

    return hours * 60 + minutes;
  };

  const minutesOfTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.getHours() * 60 + date.getMinutes();
  };

  const scheduleForDate = (timestamp?: number) => {
    if (!timestamp || !availability) return undefined;
    const weekday: WeekdayKey = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][new Date(timestamp).getDay()] as WeekdayKey;

    return availability.find((entry) => entry.weekDay.day === weekday);
  };

  const onSubmit = form.handleSubmit(async (formData) => {
    if (!user?.userId) {
      toast.error("Debes iniciar sesión para poder reservar un servicio");
      return;
    }

    if (!formData.barberId) {
      toast.error("Debes seleccionar un barbero");
      return;
    }

    const schedule = scheduleForDate(formData.date);

    if (!schedule || !schedule.weekDay.isActive) {
      toast.error("La barbería no atiende en el día seleccionado.");
      return;
    }

    const selectedMinutes = minutesOfTimestamp(formData.date);
    const openMinutes = timeStringToMinutes(schedule.openAt);
    const closeMinutes = timeStringToMinutes(schedule.closeAt);

    if (
      (openMinutes !== null && selectedMinutes < openMinutes) ||
      (closeMinutes !== null && selectedMinutes >= closeMinutes)
    ) {
      toast.error("Selecciona una hora dentro del horario de atención.");
      return;
    }

    const lunchStartMinutes = timeStringToMinutes(schedule.lunchStart);
    const lunchEndMinutes = timeStringToMinutes(schedule.lunchEnd);

    if (
      lunchStartMinutes !== null &&
      lunchEndMinutes !== null &&
      selectedMinutes >= lunchStartMinutes &&
      selectedMinutes < lunchEndMinutes
    ) {
      toast.error(
        "No se puede reservar una cita durante el horario seleccionado.",
      );
      return;
    }

    try {
      captureEvent("service_booked", {
        serviceName: service.name,
        serviceId: selectedService._id || service._id,
        barbershopId: service.barbershopId,
      });

      await createAppointment({
        appointment: {
          ...formData,
          userId: user.userId,
          barbershopId: service.barbershopId,
          serviceId: selectedService._id || service._id,
        },
      });

      toast.success("Cita reservada exitosamente");
      form.reset();
      throw navigate({ to: "/profile" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al reservar la cita",
      );
    }
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          {!initialValues && (
            <Field className="col-span-2">
              <FieldLabel htmlFor={formIds.serviceId}>Servicio</FieldLabel>

              <ServicesDropdown services={services} />
            </Field>
          )}

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
                  placeholder="3119871234"
                  autoComplete="tel"
                  type="tel"
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
            name="contactEmail"
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
                  placeholder="cliente@ejemplo.com"
                  autoComplete="email"
                  type="email"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          {isLoadingBarbers ? (
            <div className="space-y-4">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : barbers?.length && barbers?.length > 0 ? (
            <Controller
              name="barberId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formIds.barberId}>
                    {barbers?.length > 1 ? "Seleccione un barbero" : "Barbero"}
                  </FieldLabel>
                  {barbers?.length > 1 ? (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un barbero" />
                      </SelectTrigger>
                      <SelectContent>
                        {barbers.map((barber) => (
                          <SelectItem key={barber._id} value={barber._id}>
                            {barber.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <>
                      <Input
                        id={`${formIds.barberId}-display`}
                        disabled
                        value={barbers[0].name}
                      />
                      <Input {...field} id={formIds.barberId} type="hidden" />
                    </>
                  )}
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              No hay barberos disponibles
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.date}>Fecha</FieldLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[240px] pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        format(new Date(field.value as number), "PPP")
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
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
                          return;
                        }
                        const current = field.value
                          ? new Date(field.value as number)
                          : (() => {
                              const d = new Date();
                              d.setHours(8, 30, 0, 0);
                              return d;
                            })();
                        const combined = new Date(date);
                        combined.setHours(
                          current.getHours(),
                          current.getMinutes(),
                          0,
                          0,
                        );
                        field.onChange(combined.getTime());
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

          <Controller
            name="date"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.startTime}>Hora</FieldLabel>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center pl-3 text-muted-foreground peer-disabled:opacity-50">
                    <Clock8Icon className="size-4" />
                    <span className="sr-only">Hora</span>
                  </div>
                  <Input
                    type="time"
                    id={formIds.startTime}
                    value={
                      field.value
                        ? format(new Date(field.value as number), "HH:mm")
                        : ""
                    }
                    onChange={(e) => {
                      const time = e.target.value;
                      const date = field.value
                        ? new Date(field.value as number)
                        : undefined;
                      if (time) {
                        const [hours, minutes] = time.split(":").map(Number);
                        const base = date ?? new Date();
                        const updatedDate = new Date(base);
                        updatedDate.setHours(hours, minutes, 0, 0);
                        field.onChange(updatedDate.getTime());
                      }
                    }}
                    className="peer appearance-none bg-background pl-9 [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                  />
                </div>
              </Field>
            )}
          />
        </div>

        <Controller
          name="notes"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
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
      </FieldGroup>

      {!user && (
        <Item variant="warning" asChild>
          <Link to="/login" className="mt-4">
            <ItemMedia>
              <Info className="size-5" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                Debes iniciar sesión para poder reservar un servicio
              </ItemTitle>
            </ItemContent>
            <ItemActions>
              <ChevronRightIcon className="size-4" />
            </ItemActions>
          </Link>
        </Item>
      )}

      <Button
        type="submit"
        disabled={isPending || !user}
        className="mt-4 w-full"
      >
        {isPending ? <Spinner /> : "Reservar"}
      </Button>
    </form>
  );
};
