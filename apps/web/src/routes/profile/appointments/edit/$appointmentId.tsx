import { zodResolver } from "@hookform/resolvers/zod";
import type { Appointment } from "@panabarbero/convex/schemas";
import {
  createFileRoute,
  useNavigate,
  useRouter,
} from "@tanstack/react-router";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { BorderContainer } from "@/components/layout/border-container";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  appointmentByIdQueryOptions,
  useAppointmentActions,
} from "@/hooks/use-appointments";
import { appointmentStatusOptions } from "@/lib/schemas";

const editAppointmentSchema = z.object({
  customerName: z.string().min(1, "El nombre del cliente es requerido"),
  contactEmail: z.string().email("Email inválido"),
  contactPhone: z.string().min(1, "El teléfono de contacto es requerido"),
  status: z.enum([
    "pending",
    "confirmed",
    "cancelled",
    "completed",
    "no-show",
    "rescheduled",
    "denied",
  ]),
});

type EditAppointmentFormData = z.infer<typeof editAppointmentSchema>;

function getStatusLabel(status: Appointment["status"]) {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Completada";
    case "no-show":
      return "No asistió";
    case "rescheduled":
      return "Reagendada";
    case "denied":
      return "Denegada";
    default:
      return status;
  }
}

export const Route = createFileRoute(
  "/profile/appointments/edit/$appointmentId",
)({
  component: RouteComponent,
  loader: async ({ context, params }) => {
    const appointment = await context.queryClient.ensureQueryData(
      appointmentByIdQueryOptions(params.appointmentId as Appointment["_id"]),
    );

    return { appointment };
  },
});

function RouteComponent() {
  const router = useRouter();
  const navigate = useNavigate();
  const [showCompleteConfirmation, setShowCompleteConfirmation] =
    useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<
    Appointment["status"] | null
  >(null);

  const { appointment } = Route.useLoaderData();

  const {
    updateAppointmentMutation: {
      mutateAsync: updateAppointment,
      isPending: isUpdatingAppointment,
      isSuccess: isUpdatedAppointment,
    },
    setStatus,
  } = useAppointmentActions();

  useEffect(() => {
    if (isUpdatedAppointment) {
      toast.success("Cita actualizada exitosamente");
    }
  }, [isUpdatedAppointment]);

  const form = useForm<EditAppointmentFormData>({
    resolver: zodResolver(editAppointmentSchema),
    defaultValues: {
      customerName: appointment?.customerName,
      contactEmail: appointment?.contactEmail,
      contactPhone: appointment?.contactPhone,
      status: appointment?.status,
    },
  });

  const isCompleted = appointment?.status === "completed";

  const handleStatusChange = (newStatus: Appointment["status"]) => {
    if (newStatus === "completed" && appointment?.status !== "completed") {
      setPendingStatusChange(newStatus);
      setShowCompleteConfirmation(true);
    } else {
      form.setValue("status", newStatus);
    }
  };

  const confirmStatusChange = async () => {
    if (pendingStatusChange) {
      form.setValue("status", pendingStatusChange);
      setShowCompleteConfirmation(false);
      setPendingStatusChange(null);
    }
  };

  const disabled = isUpdatingAppointment || setStatus.isPending;

  const onSubmit = form.handleSubmit(async (formData) => {
    if (!appointment) return;

    try {
      // Update customer information
      await updateAppointment({
        appointmentId: appointment._id,
        appointment: {
          ...appointment,
          customerName: formData.customerName,
          contactEmail: formData.contactEmail,
          contactPhone: formData.contactPhone,
        },
      });

      // Update status if it changed
      if (formData.status !== appointment.status) {
        await setStatus.mutateAsync({
          appointmentId: appointment._id,
          status: formData.status,
        });
      }

      toast.success("Cita actualizada exitosamente");
      navigate({ to: "/profile/barbershops" });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar la cita",
      );
    }
  });

  if (!appointment) {
    return <div>Cargando...</div>;
  }

  return (
    <BorderContainer className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl">Editar cita</h1>
        <p className="mt-2 text-muted-foreground">
          {format(new Date(appointment.date), "PPP", { locale: es })}
        </p>
      </div>

      {isCompleted && (
        <div className="rounded-lg border bg-muted p-4">
          <p className="text-muted-foreground text-sm">
            Esta cita ya está completada y no puede ser editada.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <FieldGroup className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Controller
            name="customerName"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Nombre del cliente</FieldLabel>
                <Input
                  {...field}
                  disabled={isCompleted}
                  aria-invalid={fieldState.invalid}
                  placeholder="Marcos Aguilar"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="contactEmail"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Email de contacto</FieldLabel>
                <Input
                  {...field}
                  disabled={isCompleted}
                  type="email"
                  aria-invalid={fieldState.invalid}
                  placeholder="cliente@ejemplo.com"
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
                <FieldLabel>Teléfono de contacto</FieldLabel>
                <Input
                  {...field}
                  disabled={isCompleted}
                  type="tel"
                  aria-invalid={fieldState.invalid}
                  placeholder="3119871234"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="status"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Estado de la cita</FieldLabel>
                <Select
                  value={field.value}
                  onValueChange={(value) =>
                    handleStatusChange(value as Appointment["status"])
                  }
                  disabled={isCompleted}
                  aria-invalid={fieldState.invalid}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {appointmentStatusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {getStatusLabel(status)}
                      </SelectItem>
                    ))}
                    <SelectItem value="denied">Denegada</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        </FieldGroup>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.history.back()}
          >
            Cancelar y volver
          </Button>
          <Button type="submit" disabled={disabled || isCompleted}>
            {disabled && <Spinner />}
            Guardar cambios
          </Button>
        </div>
      </form>

      <AlertDialog
        open={showCompleteConfirmation}
        onOpenChange={setShowCompleteConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar completar cita</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas marcar esta cita como completada? Una
              vez completada, no podrás volver a editarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setPendingStatusChange(null);
                setShowCompleteConfirmation(false);
              }}
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </BorderContainer>
  );
}
