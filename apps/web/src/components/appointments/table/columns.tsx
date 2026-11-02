import type { Appointment } from "@convex/schema";
import type { ColumnDef } from "@tanstack/react-table";
import type { FC } from "react";
import { lazy } from "react";

import { DataTableColumnHeader } from "@/components/table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { useServiceByAppointmentId } from "@/hooks/use-services";
import { appointmentItemsLabel } from "@/lib/appointment-utils";

const RescheduleResponseDialog = lazy(() =>
  import("../reschedule-response-dialog").then((module) => ({
    default: module.RescheduleResponseDialog,
  })),
);

const LegacyServiceNameCell: FC<{ appointment: Appointment }> = ({
  appointment,
}) => {
  const { data: service } = useServiceByAppointmentId(appointment._id);
  return <span>{service?.name}</span>;
};

const ServiceNameCell: FC<{ appointment: Appointment }> = ({ appointment }) => {
  const label = appointmentItemsLabel(appointment);

  // Only legacy rows (no snapshot lines) need the live-service subscription.
  return label ? (
    <span>{label}</span>
  ) : (
    <LegacyServiceNameCell appointment={appointment} />
  );
};

const formatDateTime = (ms: number) =>
  new Date(ms).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export const rescheduledAppointmentRequestsTableColumns: ColumnDef<
  Appointment & {
    rescheduleRequestedByUserId?: string | null;
  }
>[] = [
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Cliente" />
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.original.customerName}</span>
    ),
  },
  {
    id: "serviceName",
    enableSorting: false,
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Servicio" />
    ),
    cell: ({ row }) => <ServiceNameCell appointment={row.original} />,
  },
  {
    accessorKey: "date",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha original" />
    ),
    cell: ({ row }) => (
      <span className="tabular-nums" suppressHydrationWarning>
        {formatDateTime(row.original.date)}
      </span>
    ),
  },
  {
    accessorKey: "proposedDate",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Fecha propuesta" />
    ),
    cell: ({ row }) =>
      row.original.proposedDate ? (
        <span className="tabular-nums" suppressHydrationWarning>
          {formatDateTime(row.original.proposedDate)}
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    id: "actions",
    enableSorting: false,
    enableHiding: false,
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <div className="flex justify-end">
        <RescheduleResponseDialog
          appointment={row.original}
          viewer="barber"
          trigger={
            <Button variant="outline" size="sm">
              Ver solicitud
            </Button>
          }
        />
      </div>
    ),
  },
];
