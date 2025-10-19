import type { FC } from "react";

import { Spinner } from "@/components/ui/spinner";
import { useActiveBarbershops } from "@/hooks/use-barbershop";
import type { BarbershopSearch } from "@/routes/barbershops";
import { BarbershopListCard } from "./barbershop-list-card";

interface BarbershopGridProps {
  filters: BarbershopSearch;
}

export const BarbershopGrid: FC<BarbershopGridProps> = ({ filters }) => {
  const {
    data: barbershops,
    isFetching,
    isLoading,
  } = useActiveBarbershops(filters);

  if (isLoading || isFetching) {
    return (
      <div>
        <Spinner />
        Cargando barberías...
      </div>
    );
  }

  return (
    <main className="grid grid-cols-1 gap-x-6 gap-y-8 bg-accent/20 px-4 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-3 dark:bg-accent/20">
      {barbershops.map((barbershop) => (
        <BarbershopListCard key={barbershop._id} barbershop={barbershop} />
      ))}
    </main>
  );
};
