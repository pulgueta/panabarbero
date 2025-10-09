import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Edit, Plus, Star, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { APPOINTMENT_STATUS, formatCurrency } from "@/lib/form-utils";
import type { AppointmentFormData } from "@/lib/schemas";

export const AppointmentsListPage = () => {
  const [_createDialogOpen, setCreateDialogOpen] = useState(false);
  const [_editDialogOpen, setEditDialogOpen] = useState(false);
  const [_reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<
    | (AppointmentFormData & {
        id: string;
        barbershop: string;
        barber: string;
        service: string;
        phone: string;
        email: string;
        price: number;
        duration: number;
      })
    | null
  >(null);

  // Mock data - in real app this would come from backend
  const mockAppointments: (AppointmentFormData & {
    id: string;
    barbershop: string;
    barber: string;
    service: string;
    phone: string;
    email: string;
    price: number;
    duration: number;
  })[] = [
    {
      id: "1",
      customerName: "Juan Pérez",
      phone: "3001112233",
      email: "juan.perez@example.com",
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
      barber: "Carlos Rodríguez",
      barberId: "1",
      service: "Corte de Cabello Clásico",
      serviceId: "1",
      price: 30000,
      duration: 30,
      date: new Date("2024-03-10T10:00:00"),
      startTime: "10:00",
      status: "confirmed",
      notes: "Cliente habitual, prefiere corte a tijera.",
    },
    {
      id: "2",
      customerName: "María García",
      phone: "3102223344",
      email: "maria.garcia@example.com",
      barbershop: "The Gentleman's Cut",
      barbershopId: "2",
      barber: "Miguel Ángel",
      barberId: "3",
      service: "Corte Premium",
      serviceId: "4",
      price: 60000,
      duration: 60,
      date: new Date("2024-03-11T11:30:00"),
      startTime: "11:30",
      status: "pending",
      notes: "Primera visita, recomendar productos para el cuidado de barba.",
    },
    {
      id: "3",
      customerName: "Pedro López",
      phone: "3203334455",
      email: "pedro.lopez@example.com",
      barbershop: "Barbería Tradicional",
      barbershopId: "3",
      barber: "Pedro Gómez",
      barberId: "5",
      service: "Afeitado Clásico",
      serviceId: "5",
      price: 35000,
      duration: 40,
      date: new Date("2024-03-12T14:00:00"),
      startTime: "14:00",
      status: "cancelled",
      notes: "Canceló por emergencia.",
    },
    {
      id: "4",
      customerName: "Laura Martínez",
      phone: "3014445566",
      email: "laura.martinez@example.com",
      barbershop: "Barbería El Clásico",
      barbershopId: "1",
      barber: "Juan Pérez",
      barberId: "1",
      service: "Corte + Barba",
      serviceId: "2",
      price: 45000,
      duration: 45,
      date: new Date("2024-03-10T16:00:00"),
      startTime: "16:00",
      status: "completed",
      notes: "Quedó muy satisfecho.",
    },
  ];

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      case "completed":
        return "success";
      default:
        return "outline";
    }
  };

  const getStatusLabel = (status: string) => {
    const statusInfo = APPOINTMENT_STATUS.find((s) => s.value === status);
    return statusInfo?.label || status;
  };

  const handleEdit = (
    appointment: AppointmentFormData & {
      id: string;
      barbershop: string;
      barber: string;
      service: string;
      phone: string;
      email: string;
      price: number;
      duration: number;
    },
  ) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
  };

  const handleDelete = (
    appointment: AppointmentFormData & {
      id: string;
      barbershop: string;
      barber: string;
      service: string;
      phone: string;
      email: string;
      price: number;
      duration: number;
    },
  ) => {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  };

  const handleAddReview = (
    appointment: AppointmentFormData & {
      id: string;
      barbershop: string;
      barber: string;
      service: string;
      phone: string;
      email: string;
      price: number;
      duration: number;
    },
  ) => {
    setSelectedAppointment(appointment);
    setReviewDialogOpen(true);
  };

  const handleCancelAppointment = (_appointmentId: string) => {
    toast.success("Cita cancelada exitosamente");
  };

  const handleConfirmAppointment = (_appointmentId: string) => {
    toast.success("Cita confirmada exitosamente");
  };

  const handleCompleteAppointment = (_appointmentId: string) => {
    toast.success("Cita completada exitosamente");
  };

  const handleDeleteConfirm = () => {
    toast.success(
      `Cita de "${selectedAppointment?.customerName}" eliminada exitosamente`,
    );
    setDeleteDialogOpen(false);
    setSelectedAppointment(null);
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-3xl">Citas</h1>
            <p className="text-muted-foreground">
              Gestione las citas programadas en las barberías
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cita
          </Button>
        </div>

        <div className="grid gap-6">
          {mockAppointments.map((appointment) => (
            <Card
              key={appointment.id}
              className="transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {appointment.customerName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {appointment.phone}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusBadgeVariant(appointment.status)}>
                    {getStatusLabel(appointment.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-muted-foreground text-sm">Barbería</p>
                    <p className="font-medium">{appointment.barbershop}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Barbero</p>
                    <p className="font-medium">{appointment.barber}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Servicio</p>
                    <p className="font-medium">{appointment.service}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Precio</p>
                    <p className="font-medium">
                      {formatCurrency(appointment.price)}
                    </p>
                  </div>
                </div>

                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground text-sm">Fecha</p>
                    <p className="font-medium">
                      {format(appointment.date, "EEEE, d 'de' MMMM", {
                        locale: es,
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Hora</p>
                    <p className="font-medium">
                      {format(appointment.date, "HH:mm")} (
                      {appointment.duration} min)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {appointment.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleConfirmAppointment(appointment.id)}
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment.id)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancelar
                      </Button>
                    </>
                  )}
                  {appointment.status === "confirmed" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleCompleteAppointment(appointment.id)
                        }
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Completar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment.id)}
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        Cancelar
                      </Button>
                    </>
                  )}
                  {appointment.status === "completed" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddReview(appointment)}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      Reseña
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(appointment)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(appointment)}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Create Appointment Dialog */}
      {/* <FormDialog
        trigger={<></>}
        title="Nueva Cita"
        description="Reserve una cita en la barbería de su preferencia"
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      >
        <AppointmentForm
          mode="create"
          onSuccess={() => setCreateDialogOpen(false)}
        />
      </FormDialog> */}

      {/* Edit Appointment Dialog */}
      {/* <FormDialog
        trigger={<></>}
        title="Editar Cita"
        description="Actualice la información de la cita"
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      >
        <AppointmentForm
          mode="edit"
          initialData={selectedAppointment}
          onSuccess={() => setEditDialogOpen(false)}
        />
      </FormDialog> */}

      {/* Add Review Dialog */}
      {/* <FormDialog
        trigger={<></>}
        title="Nueva Reseña"
        description={`Comparta su experiencia en ${selectedAppointment?.barbershop}`}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      >
        <ReviewForm
          mode="create"
          barbershopId={selectedAppointment?.barbershopId}
          onSuccess={() => setReviewDialogOpen(false)}
        />
      </FormDialog> */}

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title="Eliminar Cita"
        description="¿Está seguro que desea eliminar la cita de"
        itemName={selectedAppointment?.customerName}
      />
    </>
  );
};

export const Route = createFileRoute("/appointments/")({
  component: AppointmentsListPage,
});
