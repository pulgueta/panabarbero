import type { Barber } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import {
  EllipsisVerticalIcon,
  Info,
  PencilIcon,
  TrashIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export const barbersTableColumns: ColumnDef<Barber>[] = [
  {
    accessorKey: "userId",
    header: () => <div className="text-center">Nombre</div>,
    cell: ({ row }) => {
      const { data: session } = useSession();

      const userId = row.original.userId;

      const { data: userProfile } = useProfile(userId);

      const isCurrentUser = session?.userId === userId;

      return (
        <div className="text-center">
          {session?.userId === userId ? (
            <>
              <span className={isCurrentUser ? "font-bold" : "font-medium"}>
                {userProfile?.name}
              </span>
              <span className="text-muted-foreground"> (Tú)</span>
            </>
          ) : (
            userProfile?.name
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "contactPhone",
    header: () => <div className="text-center">Teléfono de contacto</div>,
    cell: ({ row }) => {
      const userId = row.original.userId;

      const { data: userProfile } = useProfile(userId);

      return (
        <div className="text-center">{userProfile?.phoneNumber ?? "N/A"}</div>
      );
    },
  },
  {
    accessorKey: "contactEmail",
    header: () => <div className="text-center">Email de contacto</div>,
    cell: ({ row }) => {
      const userId = row.original.userId;

      const { data: userProfile } = useProfile(userId);

      return <div className="text-center">{userProfile?.email ?? "N/A"}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const barbershopId = row.original.barbershopId;
      const userId = row.original.userId;

      const { data: userProfile } = useProfile(row.original.userId);

      const isCurrentUser = userProfile?.userId === userId;

      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <span className="sr-only">Abrir menú</span>
                <EllipsisVerticalIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  to={
                    isCurrentUser
                      ? "/profile"
                      : "/profile/barbershops/edit/$barbershopId"
                  }
                  params={{ barbershopId }}
                  style={{
                    viewTransitionName: `barbershop-${barbershopId}-edit`,
                  }}
                  className="inline-flex items-center gap-x-2"
                >
                  {isCurrentUser ? (
                    <>
                      <Info className="size-3" /> Mi perfil
                    </>
                  ) : (
                    <>
                      <PencilIcon className="size-3" />
                      Editar
                    </>
                  )}
                </Link>
              </DropdownMenuItem>
              {!isCurrentUser && (
                <DropdownMenuItem className="mt-1 p-0">
                  <Button variant="destructive">
                    <TrashIcon className="size-3 text-destructive-foreground" />
                    Eliminar barbero
                  </Button>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
