import type {
  Barbershop,
  BarbershopMemberWithName,
  Service,
} from "@panabarbero/convex/schemas";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Clock8Icon } from "lucide-react";
import type { BaseSyntheticEvent, FC } from "react";
import { Activity, Suspense } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Controller } from "react-hook-form";
import type { output } from "zod";

import { ServicesDropdown } from "@/components/barbershops/services/services-dropdown";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
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
import { useIsMobile } from "@/hooks/use-is-mobile";
import type { appointmentFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";

interface CreateAppointmentFormProps {
  barbershopId: Barbershop["_id"];
  barbers: BarbershopMemberWithName[];
  disabledFields?: (keyof output<typeof appointmentFormSchema>)[];
  isBarber: boolean;
  onSubmit: (e: BaseSyntheticEvent) => void;
  services: Service[];
  barberServices?: Service[] | null;
  onBarberChange?: (barberId: BarbershopMemberWithName["_id"]) => void;
  form: UseFormReturn<output<typeof appointmentFormSchema>>;
  showPhoneField?: boolean;
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
  onSubmit,
  services,
  barberServices,
  onBarberChange,
  formIds,
  form,
  showPhoneField = false,
}) => {
  const { isMobile } = useIsMobile();
  const { disableDay } = useAppointmentFormMetadata(barbershopId);

  // Use barber-specific services if available, otherwise fall back to all services
  const displayServices = barberServices ?? services;

  return (
    <form id={formIds.form} onSubmit={onSubmit}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <Field className="col-span-2">
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

          {(disabledFields?.includes("customerName") ||
            disabledFields?.includes("contactPhone") ||
            disabledFields?.includes("contactEmail")) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                name="customerName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={cn({
                      hidden:
                        disabledFields?.includes("customerName") || !isBarber,
                    })}
                  >
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

              <Controller
                name="contactPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    data-invalid={fieldState.invalid}
                    className={cn({
                      hidden:
                        disabledFields?.includes("contactPhone") ||
                        !showPhoneField,
                      "col-span-2":
                        disabledFields?.includes("contactPhone") ||
                        showPhoneField,
                    })}
                  >
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
                      disabled={disabledFields?.includes("contactPhone")}
                    />

                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          )}
        </div>

        <Controller
          name="contactEmail"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field
              data-invalid={fieldState.invalid}
              className={cn({
                hidden: disabledFields?.includes("contactEmail") || !isBarber,
              })}
            >
              <FieldLabel htmlFor={formIds.contactEmail}>
                Email de contacto (opcional)
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
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {barbers?.length ? (
            <Controller
              name="barbershopMemberId"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className={cn({
                    "col-span-2":
                      disabledFields?.includes("barbershopMemberId") ||
                      !isBarber,
                  })}
                >
                  <FieldLabel htmlFor={formIds.barbershopMemberId}>
                    {barbers?.length > 1 ? "Seleccione un barbero" : "Barbero"}
                  </FieldLabel>

                  <Suspense fallback={<Skeleton className="h-9 w-full" />}>
                    <Activity mode={barbers?.length > 1 ? "visible" : "hidden"}>
                      <Select
                        value={field.value}
                        onValueChange={(value) => {
                          field.onChange(value);
                          onBarberChange?.(
                            value as BarbershopMemberWithName["_id"],
                          );
                        }}
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
            <Field>
              <FieldLabel htmlFor={formIds.barbershopMemberId}>
                {barbers?.length > 1 ? "Seleccione un barbero" : "Barbero"}
              </FieldLabel>

              <span className="text-pretty text-muted-foreground text-sm">
                No hay barberos disponibles para este servicio
              </span>
            </Field>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                        <span className="text-xs sm:text-sm">
                          {new Date(field.value as number).toLocaleDateString(
                            "es-CO",
                            {
                              day: "2-digit",
                              month: isMobile ? "short" : "long",
                              year: "numeric",
                            },
                          )}
                        </span>
                      ) : (
                        <span className="text-xs sm:text-sm">
                          Selecciona una fecha
                        </span>
                      )}
                      <CalendarIcon className="hidden sm:ml-auto sm:block sm:size-3 sm:opacity-50" />
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
      </div>
    </form>
  );
};
