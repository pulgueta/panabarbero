import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, handleFormSubmit } from "@/lib/form-utils";
import { type AppointmentFormData, appointmentFormSchema } from "@/lib/schemas";
import { cn } from "@/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

interface AppointmentFormProps {
  onSuccess?: () => void;
  initialData?: Partial<AppointmentFormData>;
  mode?: "create" | "edit";
}

export const AppointmentForm = ({
  onSuccess,
  initialData,
  mode = "create",
}: AppointmentFormProps) => {
  // Mock data - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentFormSchema),
    defaultValues: {
      customerName: initialData?.customerName || "",
      customerPhone: initialData?.customerPhone || "",
      customerEmail: initialData?.customerEmail || "",
      barbershopId: initialData?.barbershopId || "",
      barberId: initialData?.barberId || "",
      serviceId: initialData?.serviceId || "",
      date: initialData?.date || new Date(),
      startTime: initialData?.startTime || "",
      notes: initialData?.notes || "",
    },
  });

  const watchedBarbershopId = form.watch("barbershopId");
  const watchedServiceId = form.watch("serviceId");
  const watchedDate = form.watch("date");
  const watchedStartTime = form.watch("startTime");

  const barbers = watchedBarbershopId
    ? [
        { id: "1", name: "Juan Pérez", barbershopId: "1" },
        { id: "2", name: "Carlos Rodríguez", barbershopId: "1" },
        { id: "3", name: "Miguel Ángel", barbershopId: "2" },
        { id: "4", name: "Roberto Silva", barbershopId: "2" },
        { id: "5", name: "Pedro Gómez", barbershopId: "3" },
      ].filter((b) => b.barbershopId === watchedBarbershopId)
    : [];

  const services = watchedBarbershopId
    ? [
        {
          id: "1",
          name: "Corte de Cabello Clásico",
          price: 30000,
          duration: 30,
          barbershopId: "1",
        },
        {
          id: "2",
          name: "Corte + Barba",
          price: 45000,
          duration: 45,
          barbershopId: "1",
        },
        {
          id: "3",
          name: "Diseño de Barba",
          price: 25000,
          duration: 25,
          barbershopId: "2",
        },
        {
          id: "4",
          name: "Corte Premium",
          price: 60000,
          duration: 60,
          barbershopId: "2",
        },
        {
          id: "5",
          name: "Afeitado Clásico",
          price: 35000,
          duration: 40,
          barbershopId: "3",
        },
      ].filter((s) => s.barbershopId === watchedBarbershopId)
    : [];

  const selectedService = services.find((s) => s.id === watchedServiceId);

  // Generate time slots based on barbershop hours
  const timeSlots = [];
  for (let hour = 9; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  const onSubmit = (data: AppointmentFormData) => {
    const formData = {
      ...data,
      date: data.date.toISOString(),
      customer: {
        name: data.customerName,
        phone: data.customerPhone,
        email: data.customerEmail,
      },
    };

    handleFormSubmit(formData);
    toast.success(
      mode === "create"
        ? "Cita reservada exitosamente"
        : "Cita actualizada exitosamente",
    );

    onSuccess?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Information */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Información del Cliente</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="customerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre *</FormLabel>
                  <FormControl>
                    <Input placeholder="Juan Pérez" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customerPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono *</FormLabel>
                  <FormControl>
                    <Input placeholder="3001234567" type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="customerEmail"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Correo Electrónico</FormLabel>
                <FormControl>
                  <Input
                    placeholder="correo@ejemplo.com"
                    type="email"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Separator />

        {/* Barbershop Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Selección de Servicio</h3>

          <FormField
            control={form.control}
            name="barbershopId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Barbería *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione una barbería" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {barbershops.map((barbershop) => (
                      <SelectItem key={barbershop.id} value={barbershop.id}>
                        {barbershop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {watchedBarbershopId && (
            <>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Servicio *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un servicio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {formatCurrency(service.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="barberId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Barbero *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccione un barbero" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {barbers.map((barber) => (
                            <SelectItem key={barber.id} value={barber.id}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {selectedService && (
                <div className="rounded-lg bg-muted/50 p-4">
                  <p className="font-semibold">{selectedService.name}</p>
                  <div className="mt-2 flex gap-4">
                    <Badge variant="secondary">
                      {formatCurrency(selectedService.price)}
                    </Badge>
                    <Badge variant="secondary">
                      {selectedService.duration} minutos
                    </Badge>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <Separator />

        {/* Date and Time Selection */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Fecha y Hora</h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de la Cita *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: es })
                          ) : (
                            <span>Seleccione una fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hora de Inicio *</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione una hora" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {watchedDate && watchedStartTime && (
            <div className="mt-4 rounded-md bg-muted/50 p-3">
              <p className="font-medium text-sm">Resumen de la Cita:</p>
              <p className="mt-1 text-muted-foreground text-sm">
                {format(watchedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
                  locale: es,
                })}
              </p>
              <p className="text-muted-foreground text-sm">
                Hora: {watchedStartTime}
              </p>
              {selectedService && (
                <p className="text-muted-foreground text-sm">
                  Duración estimada: {selectedService.duration} minutos
                </p>
              )}
            </div>
          )}
        </div>

        <Separator />

        {/* Additional Notes */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas Adicionales</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Instrucciones especiales o preferencias..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-4">
          <Button type="submit">
            {mode === "create" ? "Reservar Cita" : "Actualizar Cita"}
          </Button>
        </div>
      </form>
    </Form>
  );
};
