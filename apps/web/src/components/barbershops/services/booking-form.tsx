import { zodResolver } from "@hookform/resolvers/zod";
import type { Id } from "@panabarbero/convex/dataModel";
import type { Service } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import { format, startOfDay } from "date-fns";
import { CalendarIcon, ChevronRightIcon, Clock8Icon, Info } from "lucide-react";
import type { FC } from "react";
import { useCallback, useId, useState } from "react";
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
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useBarbersByBarbershopId } from "@/hooks/use-barbers";
import { useBarbershopAvailability } from "@/hooks/use-barbershop";
import { useSession } from "@/hooks/use-session";
import { appointmentFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  service: Service;
}

export const BookingForm: FC<BookingFormProps> = ({ service }) => {
  const formIds = {
    customerName: useId(),
    date: useId(),
    startTime: useId(),
    endTime: useId(),
    contactPhone: useId(),
    contactEmail: useId(),
    notes: useId(),
    form: useId(),
    barberId: useId(),
  };

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const { data: user } = useSession();

  const defaultStartTime = new Date();
  defaultStartTime.setHours(8, 30, 0, 0);

  const form = useForm({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      date: Date.now(),
      startTime: defaultStartTime.getTime(),
      endTime: Date.now(),
      customerName: user?.name ?? "",
      contactPhone: user?.phoneNumber ?? "",
      contactEmail: user?.email ?? "",
      notes: "",
      barberId: undefined,
    },
  });

  const selectedDate = form.watch("date");
  const selectedBarberId = form.watch("barberId");

  const { data: barbers, isLoading: isLoadingBarbers } =
    useBarbersByBarbershopId(service.barbershopId);
  const { data: availability } = useBarbershopAvailability(
    service.barbershopId,
  );

  console.log(barbers);

  const dayIndexes: Record<string, number> = Object.freeze({
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
      .map((d) => dayIndexes[d.weekDay.day.toLowerCase()]) ?? [],
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

  const {
    createAppointment: { mutateAsync: createAppointment, isPending },
  } = useAppointmentActions();

  const onSubmit = form.handleSubmit(async (formData) => {
    if (!user?.userId) {
      toast.error("Debes iniciar sesión para reservar un servicio");
      return;
    }

    if (!selectedDate) {
      toast.error("Debes seleccionar una fecha");
      return;
    }

    // Determine which barber to use (require selection only if > 2 barbers)
    let barberIdToUse: string | null = null;
    if (barbers?.length === 1) {
      barberIdToUse = barbers[0]._id;
    } else if (barbers && barbers.length > 2) {
      barberIdToUse = selectedBarberId ?? null;
    } else if (barbers && barbers.length <= 2) {
      barberIdToUse = selectedBarberId ?? barbers[0]._id;
    }

    if (!barberIdToUse) {
      toast.error("Debes seleccionar un barbero");
      return;
    }

    if (!formData.startTime || !selectedTime) {
      toast.error("Debes seleccionar una hora");
      return;
    }

    // Parse the selected time and create Date objects
    const [hour, minute] = selectedTime.split(":").map(Number);
    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(hour, minute, 0, 0);
    const startAt = startDateTime.getTime();
    const endAt = startAt + (service.duration ?? 0);

    // Set the date to start of day for the date field
    const dateStartOfDay = startOfDay(selectedDate);

    try {
      await createAppointment({
        appointment: {
          userId: user.userId,
          barbershopId: service.barbershopId,
          serviceId: service._id,
          barberId: barberIdToUse as unknown as Id<"barbers">,
          date: dateStartOfDay.getTime(),
          startAt,
          endAt,
          contactPhone: formData.contactPhone,
          customerName: formData.customerName,
          contactEmail: formData.contactEmail,
          notes: formData.notes,
        },
      });

      toast.success("Cita reservada exitosamente");
      form.reset();
      setSelectedTime(null);
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
          ) : barbers?.length && barbers?.length > 1 ? (
            <Controller
              name="barberId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={formIds.barberId}>
                    Seleccione un barbero
                  </FieldLabel>
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
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          ) : barbers?.length === 1 ? (
            <Controller
              name="barberId"
              control={form.control}
              render={({ field, fieldState }) => {
                // Set the value when component mounts/updates
                if (field.value !== barbers[0]._id) {
                  field.onChange(barbers[0]._id);
                }
                return (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={formIds.barberId}>Barbero</FieldLabel>
                    <Input
                      id={`${formIds.barberId}-display`}
                      disabled
                      value={barbers[0].name}
                    />
                    <Input id={formIds.barberId} type="hidden" {...field} />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                );
              }}
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
                        format(field.value, "PPP")
                      ) : (
                        <span>Seleccione una fecha</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      mode="single"
                      selected={new Date(field.value)}
                      onSelect={field.onChange}
                      defaultMonth={new Date(field.value)}
                      disabled={disableDay}
                      className="bg-transparent [--cell-size:--spacing(12)]"
                      captionLayout="label"
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
            name="startTime"
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
                    {...field}
                    type="time"
                    id={formIds.startTime}
                    value={format(new Date(field.value), "HH:mm")}
                    onChange={field.onChange}
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
