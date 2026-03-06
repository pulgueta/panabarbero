import type { Barbershop } from "@convex/tables";
import { PencilIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

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

      return <div className="text-center">{description ?? "N/A"}</div>;
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
    accessorKey: "isActive",
    header: () => <div className="text-center">Estado</div>,
    cell: ({ row }) => {
      const isActive = row.getValue("isActive");

      return (
        <div className="flex justify-center">
          <Badge variant={isActive ? "success" : "destructive"}>
            {isActive ? "Activo" : "Inactivo"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "contactPhone",
    header: () => <div className="text-center">Teléfono de contacto</div>,
    cell: ({ row }) => {
      const contactPhone = row.original.contactPhone;

      return <div className="text-center">{contactPhone ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const barbershopId = row.original._id;

      return (
        <div className="text-center">
          <Button
            variant="outline"
            render={
              <Link
                to="/profile/barbershops/edit/$barbershopId"
                params={{ barbershopId }}
                style={{
                  viewTransitionName: `barbershop-${barbershopId}-edit`,
                }}
              />
            }
          >
            <PencilIcon className="size-3" />
            Editar
          </Button>
        </div>
      );
    },
  },
];
