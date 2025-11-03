import type { Barbershop } from "@panabarbero/convex/schemas";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

export const barbershopsTableColumns: ColumnDef<Barbershop>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-center">Nombre</div>,
    cell: ({ row }) => {
      const name = row.original.name;
      return <div className="text-center">{name}</div>;
    },
  },
  {
    accessorKey: "description",
    header: () => <div className="text-center">Descripción</div>,
    cell: ({ row }) => {
      const description = row.original.description;

      return (
        <div className="text-center">
          {description ?? "No se ha proporcionado."}
        </div>
      );
    },
  },
  {
    accessorKey: "city",
    header: () => <div className="text-center">Ciudad</div>,
    cell: ({ row }) => {
      const city = row.original.city;

      return <div className="text-center">{city}</div>;
    },
  },
  {
    accessorKey: "state",
    header: () => <div className="text-center">Departamento</div>,
    cell: ({ row }) => {
      const state = row.original.state;

      return <div className="text-center">{state}</div>;
    },
  },
  {
    accessorKey: "zipCode",
    header: () => <div className="text-center">Código postal</div>,
    cell: ({ row }) => {
      const zipCode = row.original.zipCode;
      return (
        <div className="text-center">
          {zipCode ?? "No se ha proporcionado."}
        </div>
      );
    },
  },
  {
    accessorKey: "isActive",
    header: () => <div className="text-center">Activo</div>,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");

      return (
        <div className="flex justify-center">
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Sí" : "No"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "gracePeriodMinutes",
    header: () => <div className="text-center">Periodo de gracia</div>,
    cell: ({ row }) => {
      const gracePeriodMinutes = row.original.gracePeriodMinutes;

      return <div className="text-center">{gracePeriodMinutes} minutos</div>;
    },
  },
  {
    accessorKey: "contactPhone",
    header: () => <div className="text-center">Teléfono de contacto</div>,
    cell: ({ row }) => {
      const contactPhone = row.original.contactPhone;

      return (
        <div className="text-center">
          {contactPhone ?? "No se ha proporcionado."}
        </div>
      );
    },
  },
];
