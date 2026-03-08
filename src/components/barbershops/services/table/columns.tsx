import type { Service } from "@convex/schema";
import {
  DotsThreeVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import type { ColumnDef } from "@tanstack/react-table";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

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
import { formatCurrency } from "@/lib/utils";

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
      const haptic = useWebHaptics();
      const {
        deleteServiceMutation: {
          mutateAsync: deleteService,
          isPending: isDeleting,
          isSuccess: isDeleted,
        },
      } = useServiceActions();
      const [_, setOpen] = useState<boolean>(false);

      const handleDelete = async () => {
        try {
          await deleteService({
            service: { id: service._id },
            barbershop: { id: service.barbershopId },
          });
        } catch (_error) {
          haptic.trigger("error");
          toast.error("No se pudo eliminar el servicio. Intenta de nuevo.");
        }
      };

      useEffect(() => {
        if (isDeleted) {
          haptic.trigger("success");
          toast.success("Servicio eliminado exitosamente");
          setOpen(false);
        }
      }, [isDeleted, haptic]);

      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <Button variant="outline" size="icon" disabled={isDeleting}>
                  <span className="sr-only">Abrir menú</span>
                  <DotsThreeVerticalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              <ServiceDialog
                barbershopId={service.barbershopId}
                initialValues={service}
                serviceId={service._id}
                trigger={
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => e.preventDefault()}
                  >
                    <PencilIcon className="size-3" />
                    Editar
                  </DropdownMenuItem>
                }
              />

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
