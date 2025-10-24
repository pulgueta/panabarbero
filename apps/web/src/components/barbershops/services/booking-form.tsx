import { zodResolver } from "@hookform/resolvers/zod";
import type { Service } from "@panabarbero/convex/schemas";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { FC } from "react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { date, email, object, string, any as zodAny } from "zod";

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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useBarbersByBarbershopId } from "@/hooks/use-barbers";
import { useBarbershopAvailability } from "@/hooks/use-barbershop";
import { useSession } from "@/hooks/use-session";
import { cn } from "@/lib/utils";

interface BookingFormProps {
  service: Service;
}

const bookingFormSchema = object({
  customerName: string({
    error: "El nombre del cliente es requerido",
  }),
  date: date({
    error: "La fecha es requerida",
  }),
  startTime: date({
    error: "La hora de inicio es requerida",
  }),
  endTime: date({
    error: "La hora de fin es requerida",
  }),
  contactPhone: string({
    error: "El teléfono de contacto es requerido",
  })
    .min(10, "El teléfono debe tener al menos 10 caracteres")
    .max(10, "El teléfono debe tener máximo 10 caracteres"),
  contactEmail: email({
    error: "El email de contacto es requerido",
  })
    .min(6, "El email debe tener al menos 6 caracteres")
    .max(255, "El email debe tener menos de 255 caracteres"),
  notes: string().optional(),
  barberId: zodAny(),
});

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
  const [date, setDate] = useState<Date | undefined>(new Date());

  //   const convex = useConvexAction(api.);
  const { data: user } = useSession();
  const form = useForm({
    resolver: zodResolver(bookingFormSchema),
  });

  const { data: barbers } = useBarbersByBarbershopId(service.barbershopId);
  const { data: availability } = useBarbershopAvailability({
    barbershopId: service.barbershopId,
    date: date?.getTime() ?? Date.now(),
  });

  const disabledDays = availability?.availableDays
    .filter((day) => !day.isActive)
    .map((_, index) => index);

  console.log(availability);

  console.log(barbers);

  const selectedBarber =
    barbers?.length === 1 ? barbers[0] : form.watch("barberId");

  const [selectedTime, setSelectedTime] = useState<string | null>("10:00");

  const appointmentDuration = form.watch("startTime")
    ? form.watch("startTime").getTime() + (service.duration ?? 0)
    : null;

  const {
    createAppointment: { mutateAsync: createAppointment, isPending },
  } = useAppointmentActions();

  const onSubmit = form.handleSubmit(async (serviceData) => {
    if (!user?.userId) {
      toast.error("Debes iniciar sesión para reservar un servicio");
      return;
    }

    // await createAppointment({
    //   appointment: {
    //     ...serviceData,
    //     userId: session?.user.id,
    //     barbershopId: service.barbershopId,
    //     serviceId: service._id,
    //     date: serviceData.date.getTime(),
    //     startAt: serviceData.startTime.getTime(),
    //     endAt: appointmentDuration,
    //     contactPhone: serviceData.contactPhone,
    //     contactEmail: serviceData.contactEmail,
    //   },
    // });
  });

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <FieldGroup>
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {barbers?.length && barbers?.length > 1 ? (
          <Controller
            name="barberId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.barberId}>
                  Seleccione un barbero
                </FieldLabel>
                <Select
                  {...field}
                  aria-invalid={fieldState.invalid}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un barbero" />
                  </SelectTrigger>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        ) : (
          <Controller
            name="barberId"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={formIds.barberId}>Barbero</FieldLabel>
                <Input
                  {...field}
                  id={formIds.barberId}
                  disabled
                  value={selectedBarber?.name}
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        )}

        <div>
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
                      selected={date}
                      onSelect={setDate}
                      defaultMonth={date}
                      disabled={{ before: new Date(), after: new Date() }}
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
        </div>

        <Controller
          name="startTime"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={formIds.date}>Horas disponibles</FieldLabel>
              <ScrollArea className="w-96 whitespace-nowrap">
                <div
                  className={cn("flex w-max space-x-4", {
                    "px-4 py-2": availability?.availableTimeSlots,
                  })}
                >
                  {availability?.availableTimeSlots ? (
                    availability.availableTimeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? "default" : "outline"}
                        onClick={() => {
                          field.onChange(time);
                          setSelectedTime(time);
                        }}
                        className="shadow-none"
                      >
                        {time}
                      </Button>
                    ))
                  ) : (
                    <span className="inline-block text-center text-muted-foreground">
                      {form.watch("date")
                        ? "No hay horas disponibles"
                        : "Seleccione una fecha"}
                    </span>
                  )}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" disabled={isPending} className="mt-4 w-full">
        {isPending ? <Spinner /> : "Reservar"}
      </Button>
    </form>
  );
};
