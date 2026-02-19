/** biome-ignore-all lint/style/noNonNullAssertion: needed */

import type { Appointment } from "@convex/tables";
import type { ColumnDef } from "@tanstack/react-table";
import {
  CalendarClockIcon,
  EllipsisVerticalIcon,
  TrashIcon,
} from "lucide-react";
import { Activity } from "react";

import { TableHeader } from "@/components/table/header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { CancelAppointmentDialog } from "../cancel-appointment-dialog";
import { DeleteAppointmentDialog } from "../delete-appointment-dialog";
import { MarkAppointmentDialog } from "../mark-appointment-dialog";
import { RescheduleRequestDialog } from "../reschedule-request-dialog";
import { RescheduleResponseDialog } from "../reschedule-response-dialog";

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
      cell: ({ row }) => {
        const { data: service } = useServiceByAppointmentId(row.original._id);

        return <div className="text-center">{service?.name}</div>;
      },
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
      cell: ({ row }) => {
        const appointment = row.original;
        const status = row.original.status;

        const { data: session } = useSession();
        const { data: isBarber } = useIsBarber(session?.userId!);

        const isPastDate = Date.now() > appointment.date;

        const isCancelledOrDenied =
          status === "cancelled" || status === "denied";

        const canRequestReschedule =
          status !== "completed" &&
          !isCancelledOrDenied &&
          !isPastDate &&
          status !== "no-show";

        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <EllipsisVerticalIcon />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end" className="max-w-64">
                <Activity
                  mode={
                    !appointment.proposedDate && canRequestReschedule
                      ? "visible"
                      : "hidden"
                  }
                >
                  <RescheduleRequestDialog
                    appointment={appointment}
                    to="customer"
                    trigger={
                      <DropdownMenuItem
                        className="inline-flex w-full items-center gap-x-2"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <CalendarClockIcon className="size-3" />
                        Solicitar reagendamiento
                      </DropdownMenuItem>
                    }
                  />
                </Activity>

                {isCancelledOrDenied ||
                isPastDate ||
                status === "no-show" ||
                status === "completed" ? (
                  <DeleteAppointmentDialog
                    appointment={appointment}
                    trigger={
                      <DropdownMenuItem
                        className="inline-flex w-full items-center gap-x-2"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                        Eliminar
                      </DropdownMenuItem>
                    }
                  />
                ) : (
                  <CancelAppointmentDialog
                    appointment={appointment}
                    userId={appointment.userId}
                    isBarber={isBarber}
                    trigger={
                      <DropdownMenuItem
                        className="inline-flex w-full items-center gap-x-2"
                        onSelect={(event) => event.preventDefault()}
                      >
                        <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                        Cancelar
                      </DropdownMenuItem>
                    }
                  />
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const barberColumn: ColumnDef<Appointment> = {
    accessorKey: "barberName",
    header: ({ column }) => <TableHeader column={column} header="Barbero" />,
    cell: ({ row }) => {
      const { data: session } = useSession();
      const { data: barbershop } = useBarbershopByMemberUserId(
        session?.userId ?? "",
      );
      const { data: barbers } = useBarbershopMembersByBarbershopId(
        barbershop?._id!,
      );

      const barber = barbers?.find(
        (b) => b._id === row.original.barbershopMemberId,
      );

      return <div className="text-center">{barber?.name || "N/A"}</div>;
    },
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
    cell: ({ row }) => {
      const { data: service } = useServiceByAppointmentId(row.original._id);

      return <div className="text-center">{service?.name}</div>;
    },
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <TableHeader column={column} header="Fecha original" />
    ),
    cell: ({ row }) => (
      <div className="text-center">
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
      <div className="text-center">
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
