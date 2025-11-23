import { Info } from "lucide-react";
import type { FC } from "react";

import { useActiveBarbershops } from "@/hooks/barbershop/use-barbershop";
import type { BarbershopSearch } from "@/routes/barbershops";
import { BarbershopListCard } from "./barbershop-list-card";
import { BarbershopLoadingGrid } from "./barbershop-loading-grid";

interface BarbershopGridProps {
  filters: BarbershopSearch;
}

export const BarbershopGrid: FC<BarbershopGridProps> = ({ filters }) => {
  const {
    data: barbershops,
    isLoading,
    isRefetching,
  } = useActiveBarbershops(filters);

  return isLoading || isRefetching ? (
    <BarbershopLoadingGrid />
  ) : (
    <main className="grid grid-cols-1 gap-x-6 gap-y-8 bg-accent/20 px-4 py-8 md:grid-cols-2 md:px-8 xl:grid-cols-3 dark:bg-accent/20">
      {barbershops?.length && barbershops.length > 0 ? (
        barbershops.map((barbershop) => (
          <BarbershopListCard key={barbershop._id} barbershop={barbershop} />
        ))
      ) : (
        <div className="col-span-3 flex flex-col items-center justify-center gap-2">
          <Info className="size-6 text-muted-foreground" />
          <p className="text-pretty text-center text-muted-foreground text-sm">
            No se encontraron barberías disponibles.
          </p>
        </div>
      )}
    </main>
  );
};
