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
import { APPOINTMENT_STATUS } from "@/lib/form-utils";
import type { AppointmentFormData } from "@/lib/schemas";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CheckCircle, Edit, Plus, Star, Trash2, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/appointments/")({
  component: AppointmentsPage,
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.appointments.getAppointments, {}),
    );
  },
});

function AppointmentsPage() {
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

  const { data: appointments } = useSuspenseQuery(
    convexQuery(api.appointments.getAppointments, {}),
  );

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
          {appointments.map((appointment) => (
            <Card
              key={appointment._id}
              className="transition-shadow hover:shadow-lg"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">
                      {appointment.userId}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {appointment.contactPhone}
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
                    <p className="font-medium">{appointment.barbershopId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Barbero</p>
                    <p className="font-medium">{appointment.barberId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Servicio</p>
                    <p className="font-medium">{appointment.serviceId}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm">Precio</p>
                    <p className="font-medium">{appointment.contactPhone}</p>
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
                      {format(appointment.date, "HH:mm")} ({appointment.startAt}{" "}
                      min)
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {appointment.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        onClick={() =>
                          handleConfirmAppointment(appointment._id)
                        }
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Confirmar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment._id)}
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
                          handleCompleteAppointment(appointment._id)
                        }
                      >
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Completar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleCancelAppointment(appointment._id)}
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
                      onClick={() => handleAddReview(appointment._id)}
                    >
                      <Star className="mr-1 h-3 w-3" />
                      Reseña
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(appointment._id)}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(appointment._id)}
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
        itemName={selectedAppointment?.barberId}
      />
    </>
  );
}
