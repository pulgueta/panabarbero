/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import type { Id } from "@convex/_generated/dataModel";
import type { Appointment } from "@convex/schema";
import {
  CalendarCheckIcon,
  DotsThreeVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ColumnDef } from "@tanstack/react-table";
import type { FC } from "react";
import { lazy, useState } from "react";

import { TableHeader } from "@/components/table/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useBarbershopByMemberUserId } from "@/hooks/barbershop/use-barbershop";
import {
  useBarbershopMembersByBarbershopId,
  useIsBarber,
} from "@/hooks/use-barbershop-members";
import { useServiceByAppointmentId } from "@/hooks/use-services";
import { useSession } from "@/hooks/use-session";
import { getAppointmentDataByStatus } from "@/lib/appointment-utils";

const CancelAppointmentDialog = lazy(() =>
  import("../cancel-appointment-dialog").then((module) => ({
    default: module.CancelAppointmentDialog,
  })),
);
const DeleteAppointmentDialog = lazy(() =>
  import("../delete-appointment-dialog").then((module) => ({
    default: module.DeleteAppointmentDialog,
  })),
);
const MarkAppointmentDialog = lazy(() =>
  import("../mark-appointment-dialog").then((module) => ({
    default: module.MarkAppointmentDialog,
  })),
);
const RescheduleRequestDialog = lazy(() =>
  import("../reschedule-request-dialog").then((module) => ({
    default: module.RescheduleRequestDialog,
  })),
);
const RescheduleResponseDialog = lazy(() =>
  import("../reschedule-response-dialog").then((module) => ({
    default: module.RescheduleResponseDialog,
  })),
);

const ServiceNameCell: FC<{ appointmentId: Appointment["_id"] }> = ({
  appointmentId,
}) => {
  const { data: service } = useServiceByAppointmentId(appointmentId);
  return <div className="text-center">{service?.name}</div>;
};

const AppointmentActionsCell: FC<Appointment> = (appointment) => {
  const status = appointment.status;

  const { data: session } = useSession();
  const { data: isBarber } = useIsBarber(session?.userId ?? "");

  const isPastDate = Date.now() > appointment.date;

  const isCancelledOrDenied = status === "cancelled" || status === "denied";

  const canRequestReschedule =
    status !== "completed" &&
    !isCancelledOrDenied &&
    !isPastDate &&
    status !== "no-show" &&
    !appointment.proposedDate;

  const showDeleteDialog =
    isCancelledOrDenied || isPastDate || status === "no-show";

  const hasSetStatus = status === "completed" || status === "no-show";

  const [openDialog, setOpenDialog] = useState<
    "reschedule" | "delete" | "cancel" | null
  >(null);

  return (
    <div className="text-center">
      {status === "completed" ? (
        <p className="text-muted-foreground leading-7">Sin acciones</p>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="outline" size="icon">
                <DotsThreeVerticalIcon />
              </Button>
            }
          />

          <DropdownMenuContent align="end" className="w-full max-w-56">
            {canRequestReschedule && (
              <DropdownMenuItem
                onClick={() => setOpenDialog("reschedule")}
                render={
                  <Button variant="outline" className="w-full">
                    <CalendarCheckIcon />
                    Solicitar reagendamiento
                  </Button>
                }
              />
            )}

            {canRequestReschedule && <DropdownMenuSeparator />}

            {showDeleteDialog ? (
              isPastDate && !hasSetStatus ? (
                <DropdownMenuItem>
                  Debes marcar la cita para poder eliminarla
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => setOpenDialog("delete")}
                  render={
                    <Button variant="destructive" className="w-full">
                      <TrashIcon />
                      Eliminar
                    </Button>
                  }
                />
              )
            ) : (
              <DropdownMenuItem
                onClick={() => setOpenDialog("cancel")}
                render={
                  <Button variant="destructive" className="w-full">
                    <TrashIcon />
                    Cancelar
                  </Button>
                }
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <RescheduleRequestDialog
        appointment={appointment}
        to="customer"
        open={openDialog === "reschedule"}
        onOpenChange={(open) => !open && setOpenDialog(null)}
        trigger={<span className="hidden" />}
      />

      {showDeleteDialog ? (
        <DeleteAppointmentDialog
          appointment={appointment}
          open={openDialog === "delete"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          trigger={<span className="hidden" />}
        />
      ) : (
        <CancelAppointmentDialog
          appointment={appointment}
          userId={appointment.userId}
          isBarber={isBarber ?? false}
          open={openDialog === "cancel"}
          onOpenChange={(open) => !open && setOpenDialog(null)}
          trigger={<span className="hidden" />}
        />
      )}
    </div>
  );
};

const BarberNameCell: FC<Appointment> = (appointment) => {
  const { data: session } = useSession();
  const { data: barbershop } = useBarbershopByMemberUserId(
    session?.userId ?? "",
  );
  const { data: barbers } = useBarbershopMembersByBarbershopId(
    barbershop?._id as Id<"barbershops">,
  );

  const barber = barbers?.find((b) => b._id === appointment.barbershopMemberId);

  return <div className="text-center">{barber?.name || "N/A"}</div>;
};

export function getAppointmentsTableColumns(opts: {
  isOwner: boolean;
}): ColumnDef<Appointment>[] {
  const baseColumns: ColumnDef<Appointment>[] = [
    {
      accessorKey: "date",
      header: ({ column }) => <TableHeader column={column} header="Hora" />,
      cell: ({ row }) => {
        const date = new Date(row.original.date).toLocaleTimeString("es-CO", {
          hour: "2-digit",
          minute: "2-digit",
        });

        return <div className="text-center">{date}</div>;
      },
    },
    {
      accessorKey: "customerName",
      header: ({ column }) => <TableHeader column={column} header="Cliente" />,
      cell: ({ row }) => (
        <div className="text-center">{row.original.customerName}</div>
      ),
    },
    {
      accessorKey: "contactPhone",
      header: ({ column }) => <TableHeader column={column} header="Teléfono" />,
      cell: ({ row }) => (
        <div className="text-center">{row.original.contactPhone}</div>
      ),
    },
    {
      accessorKey: "serviceName",
      header: ({ column }) => <TableHeader column={column} header="Servicio" />,
      cell: ({ row }) => <ServiceNameCell appointmentId={row.original._id} />,
    },
    {
      accessorKey: "notes",
      header: ({ column }) => <TableHeader column={column} header="Notas" />,
      cell: ({ row }) => (
        <div className="text-center">
          {row.original.notes || "No hay notas"}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => <TableHeader column={column} header="Estado" />,
      cell: ({ row }) => {
        const status = row.original.status;
        const { label, variant } = getAppointmentDataByStatus(status);

        const isPastDate = Date.now() > row.original.date;
        const hasSetStatus = status === "completed" || status === "no-show";

        return (
          <div className="text-center">
            {isPastDate && !hasSetStatus ? (
              <MarkAppointmentDialog
                trigger={<Button variant="outline">Marcar</Button>}
                appointmentId={row.original._id}
              />
            ) : (
              <Badge variant={variant}>{label}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => <AppointmentActionsCell {...row.original} />,
    },
  ];

  const barberColumn: ColumnDef<Appointment> = {
    accessorKey: "barberName",
    header: ({ column }) => <TableHeader column={column} header="Barbero" />,
    cell: ({ row }) => <BarberNameCell {...row.original} />,
  };

  if (!opts.isOwner) return baseColumns;

  // Insert the barber column after "Servicio"
  const serviceIndex = baseColumns.findIndex(
    (col) => "accessorKey" in col && col.accessorKey === "serviceName",
  );

  if (serviceIndex === -1) return [...baseColumns, barberColumn];

  return [
    ...baseColumns.slice(0, serviceIndex + 1),
    barberColumn,
    ...baseColumns.slice(serviceIndex + 1),
  ];
}

export const rescheduledAppointmentRequestsTableColumns: ColumnDef<
  Appointment & {
    rescheduleRequestedByUserId?: string | null;
  }
>[] = [
  {
    accessorKey: "customerName",
    header: ({ column }) => <TableHeader column={column} header="Cliente" />,
    cell: ({ row }) => (
      <div className="text-center">{row.original.customerName}</div>
    ),
  },
  {
    accessorKey: "serviceName",
    header: ({ column }) => <TableHeader column={column} header="Servicio" />,
    cell: ({ row }) => <ServiceNameCell appointmentId={row.original._id} />,
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <TableHeader column={column} header="Fecha original" />
    ),
    cell: ({ row }) => (
      <div className="text-center" suppressHydrationWarning>
        {new Date(row.original.date).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    ),
  },
  {
    accessorKey: "proposedDate",
    header: ({ column }) => (
      <TableHeader column={column} header="Fecha propuesta" />
    ),
    cell: ({ row }) => (
      <div className="text-center" suppressHydrationWarning>
        {new Date(row.original.proposedDate!).toLocaleDateString("es-CO", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </div>
    ),
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => (
      <div className="text-center">
        <RescheduleResponseDialog
          appointment={row.original}
          viewer="barber"
          trigger={<Button variant="outline">Ver solicitud</Button>}
        />
      </div>
    ),
  },
];
