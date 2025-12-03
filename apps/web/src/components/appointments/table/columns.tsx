import type { Appointment } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarCheckIcon,
  CalendarClockIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAppointmentActions } from "@/hooks/use-appointments";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useSession } from "@/hooks/use-session";
import {
  getAppointmentStatusBadgeVariant,
  getAppointmentStatusLabel,
} from "@/lib/appointment-utils";
import { RescheduleRequestDialog } from "../reschedule-request-dialog";

export const appointmentsTableColumns: ColumnDef<Appointment>[] = [
  {
    accessorKey: "customerName",
    header: () => <div className="text-center">Cliente</div>,
    cell: ({ row }) => {
      const customerName = row.original.customerName;

      return <div className="text-center">{customerName}</div>;
    },
  },
  {
    accessorKey: "contactEmail",
    header: () => <div className="text-center">Correo electrónico</div>,
    cell: ({ row }) => {
      const contactEmail = row.original.contactEmail;

      return <div className="text-center">{contactEmail ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "contactPhone",
    header: () => <div className="text-center">Teléfono</div>,
    cell: ({ row }) => {
      const contactPhone = row.original.contactPhone;

      return <div className="text-center">{contactPhone}</div>;
    },
  },
  {
    accessorKey: "date",
    header: () => <div className="text-center">Fecha y hora</div>,
    cell: ({ row }) => {
      const date = new Date(row.original.date).toLocaleDateString("es-CO", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      });

      return <div className="text-center">{date}</div>;
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="text-center">Estado</div>,
    cell: ({ row }) => {
      const status = row.original.status;

      return (
        <div className="flex justify-center">
          <Badge variant={getAppointmentStatusBadgeVariant(status)}>
            {getAppointmentStatusLabel(status)}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "notes",
    header: () => <div className="text-center">Notas</div>,
    cell: ({ row }) => {
      const notes = row.original.notes;

      return <div className="line-clamp-1 text-center">{notes ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => <ActionsCell appointment={row.original} />,
  },
];

function ActionsCell({ appointment }: { appointment: Appointment }) {
  const appointmentId = appointment._id;
  const isCompleted = appointment.status === "completed";
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { data: session } = useSession();
  const { isMobile } = useIsMobile();
  const {
    deleteAppointmentMutation: {
      mutateAsync: deleteAppointment,
      isPending: isDeletingAppointment,
    },
    cancel: {
      mutateAsync: cancelAppointment,
      isPending: isCancellingAppointment,
    },
  } = useAppointmentActions();

  const handleDelete = async () => {
    if (!deleteReason.trim()) {
      setDeleteError("Debes ingresar una razón para cancelar la cita.");
      return;
    }

    if (!session?.userId) {
      toast.error("Debes iniciar sesión para eliminar esta cita.");
      return;
    }

    try {
      const reason = deleteReason.trim();
      await cancelAppointment({
        appointmentId,
        cancelledByUserId: session.userId,
        reason,
      });
      await deleteAppointment({ appointmentId });
      toast.success("La cita fue cancelada y eliminada exitosamente.");
      setDeleteReason("");
      setDeleteError(null);
      setIsDeleteDialogOpen(false);
      resetDeleteState();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo eliminar la cita. Inténtalo de nuevo.",
      );
    }
  };

  const resetDeleteState = () => {
    setDeleteReason("");
    setDeleteError(null);
  };

  const deleteDialogDescription =
    "Esta acción cancelará la cita, enviará un correo al cliente con el motivo indicado y luego la eliminará definitivamente.";

  const deleteDialogChildren = useMemo(
    () => (
      <div className="space-y-3 text-left">
        <Textarea
          value={deleteReason}
          onChange={(event) => {
            setDeleteReason(event.target.value);
            if (deleteError) {
              setDeleteError(null);
            }
          }}
          placeholder="Ej. El barbero tuvo una emergencia y no podrá atender."
        />
        {deleteError ? (
          <p className="text-destructive text-sm">{deleteError}</p>
        ) : null}
      </div>
    ),
    [deleteError, deleteReason],
  );

  return (
    <div className="text-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <EllipsisVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-w-52">
          <DropdownMenuItem
            disabled={isCompleted}
            className="inline-flex w-full items-center gap-x-2"
            onSelect={(event) => {
              event.preventDefault();
              if (isCompleted) return;
              setIsRescheduleOpen(true);
            }}
          >
            <CalendarClockIcon className="size-3" />
            Solicitar reagendamiento
          </DropdownMenuItem>
          {appointment.proposedDate ? (
            <DropdownMenuItem asChild>
              <Link
                to={"/profile/appointments/reschedule/$appointmentId"}
                params={{ appointmentId: appointmentId as string }}
                style={{
                  viewTransitionName: `appointment-${appointmentId}-reschedule`,
                }}
                className="inline-flex w-full items-center gap-x-2"
              >
                <CalendarCheckIcon className="size-3" />
                Gestionar reagendamiento
              </Link>
            </DropdownMenuItem>
          ) : null}
          {isMobile ? (
            <Drawer
              open={isDeleteDialogOpen}
              onOpenChange={(value) => {
                setIsDeleteDialogOpen(value);
                if (!value) {
                  resetDeleteState();
                }
              }}
            >
              <DrawerTrigger asChild>
                <DropdownMenuItem
                  className="inline-flex w-full items-center gap-x-2"
                  onSelect={(event) => event.preventDefault()}
                  disabled={isDeletingAppointment || isCancellingAppointment}
                >
                  <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                  Eliminar cita
                </DropdownMenuItem>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Eliminar cita</DrawerTitle>
                  <DrawerDescription>
                    {deleteDialogDescription}
                  </DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 text-left text-muted-foreground text-sm">
                  {deleteDialogChildren}
                </div>
                <DrawerFooter>
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isDeletingAppointment || isCancellingAppointment}
                  >
                    {isDeletingAppointment || isCancellingAppointment ? (
                      <Spinner />
                    ) : (
                      "Sí, eliminar"
                    )}
                  </Button>
                  <DrawerClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDeleteState}
                    >
                      No, cancelar
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={(value) => {
                setIsDeleteDialogOpen(value);
                if (!value) {
                  resetDeleteState();
                }
              }}
            >
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  className="inline-flex w-full items-center gap-x-2"
                  onSelect={(event) => event.preventDefault()}
                  disabled={isDeletingAppointment || isCancellingAppointment}
                >
                  <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                  Eliminar cita
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar cita</AlertDialogTitle>
                  <AlertDialogDescription>
                    {deleteDialogDescription}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteDialogChildren}
                <AlertDialogFooter>
                  <AlertDialogCancel asChild>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={resetDeleteState}
                    >
                      No, cancelar
                    </Button>
                  </AlertDialogCancel>
                  <AlertDialogAction asChild>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={
                        isDeletingAppointment || isCancellingAppointment
                      }
                    >
                      {isDeletingAppointment || isCancellingAppointment ? (
                        <Spinner />
                      ) : (
                        "Sí, eliminar"
                      )}
                    </Button>
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <RescheduleRequestDialog
        appointment={appointment}
        to="customer"
        disabled={isCompleted}
        open={isRescheduleOpen}
        onOpenChange={setIsRescheduleOpen}
        trigger={null}
      />
    </div>
  );
}
