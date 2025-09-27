import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/appointments/new")({
  component: NewAppointmentPage,
});

function NewAppointmentPage() {
  const navigate = useNavigate();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date(),
  );
  const [barbershopId, setBarbershopId] = useState("");
  const [barberId, setBarberId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Mock data - in real app this would come from backend
  const barbershops = [
    { id: "1", name: "Barbería El Clásico" },
    { id: "2", name: "The Gentleman's Cut" },
    { id: "3", name: "Barbería Tradicional" },
  ];

  const barbers = barbershopId
    ? [
        { id: "1", name: "Juan Pérez", barbershopId: "1" },
        { id: "2", name: "Carlos Rodríguez", barbershopId: "1" },
        { id: "3", name: "Miguel Ángel", barbershopId: "2" },
        { id: "4", name: "Roberto Silva", barbershopId: "2" },
        { id: "5", name: "Pedro Gómez", barbershopId: "3" },
      ].filter((b) => b.barbershopId === barbershopId)
    : [];

  const services = barbershopId
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
      ].filter((s) => s.barbershopId === barbershopId)
    : [];

  const selectedService = services.find((s) => s.id === serviceId);

  // Generate time slots based on barbershop hours
  const timeSlots = [];
  for (let hour = 9; hour < 19; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      timeSlots.push(time);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (
      !barbershopId ||
      !barberId ||
      !serviceId ||
      !startTime ||
      !selectedDate
    ) {
      toast.error("Por favor complete todos los campos requeridos");
      return;
    }

    const formData = {
      barbershopId,
      barberId,
      serviceId,
      date: selectedDate.toISOString(),
      startTime,
      notes,
      customer: {
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      },
    };

    handleFormSubmit(formData);
    toast.success("Cita reservada exitosamente");

    // Navigate to appointments list
    navigate({ to: "/appointments" });
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Nueva Cita</CardTitle>
            <CardDescription>
              Reserve una cita en la barbería de su preferencia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Información del Cliente</h3>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Nombre *</Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Juan Pérez"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Teléfono *</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="3001234567"
                    type="tel"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Correo Electrónico</Label>
                  <Input
                    id="customerEmail"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    type="email"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Barbershop Selection */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Selección de Barbería</h3>

              <div className="space-y-2">
                <Label htmlFor="barbershop">Barbería *</Label>
                <Select value={barbershopId} onValueChange={setBarbershopId}>
                  <SelectTrigger id="barbershop">
                    <SelectValue placeholder="Seleccione una barbería" />
                  </SelectTrigger>
                  <SelectContent>
                    {barbershops.map((barbershop) => (
                      <SelectItem key={barbershop.id} value={barbershop.id}>
                        {barbershop.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {barbershopId && (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="barber">Barbero *</Label>
                      <Select value={barberId} onValueChange={setBarberId}>
                        <SelectTrigger id="barber">
                          <SelectValue placeholder="Seleccione un barbero" />
                        </SelectTrigger>
                        <SelectContent>
                          {barbers.map((barber) => (
                            <SelectItem key={barber.id} value={barber.id}>
                              {barber.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="service">Servicio *</Label>
                      <Select value={serviceId} onValueChange={setServiceId}>
                        <SelectTrigger id="service">
                          <SelectValue placeholder="Seleccione un servicio" />
                        </SelectTrigger>
                        <SelectContent>
                          {services.map((service) => (
                            <SelectItem key={service.id} value={service.id}>
                              {service.name} - {formatCurrency(service.price)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
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
                <div className="space-y-2">
                  <Label>Fecha de la Cita *</Label>
                  <div className="rounded-md border p-3">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      locale={es}
                      className="rounded-md"
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Hora de Inicio *</Label>
                  <Select value={startTime} onValueChange={setStartTime}>
                    <SelectTrigger id="time">
                      <SelectValue placeholder="Seleccione una hora" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => (
                        <SelectItem key={time} value={time}>
                          {time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedDate && startTime && (
                    <div className="mt-4 rounded-md bg-muted/50 p-3">
                      <p className="font-medium text-sm">Resumen de la Cita:</p>
                      <p className="mt-1 text-muted-foreground text-sm">
                        {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
                          locale: es,
                        })}
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Hora: {startTime}
                      </p>
                      {selectedService && (
                        <p className="text-muted-foreground text-sm">
                          Duración estimada: {selectedService.duration} minutos
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Additional Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionales</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Instrucciones especiales o preferencias..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate({ to: "/appointments" })}
              >
                Cancelar
              </Button>
              <Button type="submit">Reservar Cita</Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
