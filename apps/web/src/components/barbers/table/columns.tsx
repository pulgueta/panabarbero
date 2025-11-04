import type { Barber } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
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
