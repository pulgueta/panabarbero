/** biome-ignore-all lint/correctness/useHookAtTopLevel: Avoid loading warning */

import { createFileRoute } from "@tanstack/react-router";
import { PlusIcon } from "lucide-react";

import { barbershopsTableColumns } from "@/components/barbershops/table/columns";
import { LoadingComponent } from "@/components/layout/loading-component";
import { DataTable } from "@/components/table/data-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopsByOwnerId } from "@/hooks/use-barbershop";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops")({
  component: RouteComponent,
  pendingComponent: LoadingComponent,
});

function RouteComponent() {
  const { data: user } = useSession();

  const { data: barbershops, isLoading: isLoadingBarbershops } =
    useBarbershopsByOwnerId(user?.userId ?? "");

  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-start justify-start border-x px-4 py-8 md:px-8 lg:px-16">
      <header className="mb-6 flex w-full flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="font-bold text-3xl tracking-tight">Mis barberías</h1>

        <Button>
          <PlusIcon className="size-4" />
          Nueva barbería
        </Button>
      </header>

      {isLoadingBarbershops ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <DataTable columns={barbershopsTableColumns} data={barbershops ?? []} />
      )}
    </div>
  );
}
