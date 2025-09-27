import { AppointmentForm } from "@/components/appointment-form";
import { DeleteConfirmationDialog } from "@/components/delete-confirmation-dialog";
import { FormDialog } from "@/components/form-dialog";
import { ReviewForm } from "@/components/review-form";
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
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Edit, Plus, Star, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/appointments/")({
  component: AppointmentsListPage,
});

function AppointmentsListPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

  // Mock data - in real app this would come from backend
  const mockAppointments = [
    {
      id: "1",
      customerName: "Juan Pérez",
      barbershop: "Barbería El Clásico",
      barber: "Carlos Rodríguez",
      service: "Corte de Cabello Clásico",
      date: new Date("2024-01-15T10:00:00"),
      duration: 30,
      price: 30000,
      status: "confirmed",
      phone: "3001234567",
    },
    {
      id: "2",
      customerName: "María García",
      barbershop: "The Gentleman's Cut",
      barber: "Miguel Ángel",
      service: "Corte Premium",
      date: new Date("2024-01-15T14:30:00"),
      duration: 60,
      price: 60000,
      status: "pending",
      phone: "3007654321",
    },
    {
      id: "3",
      customerName: "Pedro López",
      barbershop: "Barbería Tradicional",
      barber: "Pedro Gómez",
      service: "Afeitado Clásico",
      date: new Date("2024-01-16T09:00:00"),
      duration: 40,
      price: 35000,
      status: "completed",
      phone: "3009876543",
    },
    {
      id: "4",
      customerName: "Ana Martínez",
      barbershop: "Barbería El Clásico",
      barber: "Juan Pérez",
      service: "Corte + Barba",
      date: new Date("2024-01-16T11:00:00"),
      duration: 45,
      price: 45000,
      status: "cancelled",
      phone: "3005555555",
    },
  ];

  function getStatusBadgeVariant(status: string) {
    switch (status) {
      case "confirmed":
        return "default";
      case "pending":
        return "secondary";
      case "completed":
        return "outline";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  }

  function getStatusLabel(status: string) {
    const statusInfo = APPOINTMENT_STATUS.find((s) => s.value === status);
    return statusInfo?.label || status;
  }

  function handleEdit(appointment: any) {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
  }

  function handleDelete(appointment: any) {
    setSelectedAppointment(appointment);
    setDeleteDialogOpen(true);
  }

  function handleAddReview(appointment: any) {
    setSelectedAppointment(appointment);
    setReviewDialogOpen(true);
  }

  function handleCancelAppointment(_appointmentId: string) {
    toast.success("Cita cancelada exitosamente");
  }

  function handleConfirmAppointment(_appointmentId: string) {
    toast.success("Cita confirmada exitosamente");
  }

  function handleCompleteAppointment(_appointmentId: string) {
    toast.success("Cita completada exitosamente");
  }

  function handleDeleteConfirm() {
    toast.success(
      `Cita de "${selectedAppointment?.customerName}" eliminada exitosamente`,
    );
    setDeleteDialogOpen(false);
    setSelectedAppointment(null);
  }

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
      <FormDialog
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
      </FormDialog>

      {/* Edit Appointment Dialog */}
      <FormDialog
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
      </FormDialog>

      {/* Add Review Dialog */}
      <FormDialog
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
      </FormDialog>

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
}
