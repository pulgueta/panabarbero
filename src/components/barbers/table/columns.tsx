import type { BarbershopMember } from "@convex/tables";
import {
  DotsThreeVerticalIcon,
  InfoIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/use-profile";
import { useSession } from "@/hooks/use-session";

export const barbersTableColumns: ColumnDef<BarbershopMember>[] = [
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
        <div className="text-center">
          {userProfile?.phoneNumber ||
            "No se ha proporcionado un número de contacto"}
        </div>
      );
    },
  },
  {
    accessorKey: "contactEmail",
    header: () => <div className="text-center">Email de contacto</div>,
    cell: ({ row }) => {
      const userId = row.original.userId;

      const { data: userProfile } = useProfile(userId);

      return <div className="text-center">{userProfile?.email}</div>;
    },
  },
  {
    accessorKey: "actions",
    header: () => <div className="text-center">Acciones</div>,
    cell: ({ row }) => {
      const userId = row.original.userId;

      const { data: userProfile } = useProfile(row.original.userId);

      const isCurrentUser = userProfile?.userId === userId;

      return (
        <div className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger
              nativeButton={false}
              render={
                <Button variant="outline" size="icon">
                  <span className="sr-only">Abrir menú</span>
                  <DotsThreeVerticalIcon />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {isCurrentUser ? (
                <DropdownMenuItem>
                  <Link
                    to="/profile"
                    style={{
                      viewTransitionName: "profile-view",
                    }}
                    className="inline-flex w-full items-center gap-x-2"
                  >
                    <InfoIcon className="size-3" /> Mi perfil
                  </Link>
                </DropdownMenuItem>
              ) : (
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
