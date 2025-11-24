import type { Appointment } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon } from "lucide-react";

import type { BadgeProps } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function getStatusBadgeVariant(
  status: Appointment["status"],
): BadgeProps["variant"] {
  switch (status) {
    case "confirmed":
      return "success";
    case "cancelled":
    case "denied":
    case "no-show":
      return "destructive";
  }
}

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
  }
}

export const appointmentsTableColumns: ColumnDef<Appointment>[] = [
  {
    accessorKey: "customerName",
    header: () => <div className="text-center">Nombre del cliente</div>,
    cell: ({ row }) => {
      const customerName = row.original.customerName;

      return <div className="text-center">{customerName}</div>;
    },
  },
  {
    accessorKey: "contactEmail",
    header: () => <div className="text-center">Email de contacto</div>,
    cell: ({ row }) => {
      const contactEmail = row.original.contactEmail;

      return <div className="text-center">{contactEmail ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "contactPhone",
    header: () => <div className="text-center">Teléfono de contacto</div>,
    cell: ({ row }) => {
      const contactPhone = row.original.contactPhone;

      return <div className="text-center">{contactPhone}</div>;
    },
  },
  {
    accessorKey: "date",
    header: () => <div className="text-center">Fecha</div>,
    cell: ({ row }) => {
      const date = new Date(row.original.date).toLocaleDateString("es-CO");

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
          <Badge variant={getStatusBadgeVariant(status)}>
            {getStatusLabel(status)}
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

      return <div className="text-center">{notes ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const barbershopId = row.original._id;

      return (
        <div className="text-center">
          <Button variant="outline" asChild>
            <Link
              to="/profile/barbershops/edit/$barbershopId"
              params={{ barbershopId }}
              style={{
                viewTransitionName: `barbershop-${barbershopId}-edit`,
              }}
            >
              <PencilIcon className="size-3" />
              Editar
            </Link>
          </Button>
        </div>
      );
    },
  },
];
