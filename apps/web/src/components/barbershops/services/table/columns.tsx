import type { Service } from "@panabarbero/convex/schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { EllipsisVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ServiceDialog } from "@/components/barbershops/services/service-dialog";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { useServiceActions } from "@/hooks/use-services";
import { formatCurrency } from "@/lib/form-utils";

export const servicesTableColumns: ColumnDef<Service>[] = [
  {
    accessorKey: "name",
    header: () => <div className="text-center">Servicio</div>,
    cell: ({ row }) => <div className="text-center">{row.original.name}</div>,
  },
  {
    accessorKey: "duration",
    header: () => <div className="text-center">Duración</div>,
    cell: ({ row }) => (
      <div className="text-center">{row.original.duration} min</div>
    ),
  },
  {
    accessorKey: "price",
    header: () => <div className="text-center">Precio</div>,
    cell: ({ row }) => (
      <div className="text-center">{formatCurrency(row.original.price)}</div>
    ),
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const service = row.original;
      const {
        deleteServiceMutation: {
          mutateAsync: deleteService,
          isPending: isDeleting,
          isSuccess: isDeleted,
        },
      } = useServiceActions();
      const [_, setOpen] = useState<boolean>(false);

      const handleDelete = async () => {
        await deleteService({
          serviceId: service._id,
          barbershopId: service.barbershopId,
        });
      };

      useEffect(() => {
        if (isDeleted) {
          toast.success("Servicio eliminado exitosamente");
          setOpen(false);
        }
      }, [isDeleted]);

      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" disabled={isDeleting}>
                <span className="sr-only">Abrir menú</span>
                <EllipsisVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <ServiceDialog
                asChild
                barbershopId={service.barbershopId}
                initialValues={service}
                serviceId={service._id}
              >
                <DropdownMenuItem
                  className="cursor-pointer"
                  onSelect={(e) => e.preventDefault()}
                >
                  <PencilIcon className="size-3" />
                  Editar
                </DropdownMenuItem>
              </ServiceDialog>

              <ConfirmationDialog
                trigger={
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <TrashIcon className="size-3 text-destructive dark:text-destructive-foreground" />
                    Eliminar
                  </DropdownMenuItem>
                }
                title="Eliminar servicio"
                description="¿Estás seguro que desea eliminar el servicio? Esta acción no se puede deshacer."
                confirmLabel={
                  <Button variant="destructive" onClick={handleDelete}>
                    {isDeleting ? <Spinner /> : "Sí, eliminar"}
                  </Button>
                }
                cancelLabel={
                  <Button type="button" variant="outline">
                    No, cancelar
                  </Button>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
