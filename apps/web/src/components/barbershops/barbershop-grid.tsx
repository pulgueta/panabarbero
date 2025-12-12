import type { Barbershop } from "@panabarbero/convex/schemas";
import type { FC } from "react";

import { BarbershopListCard } from "./barbershop-list-card";

interface BarbershopGridProps {
  barbershops: Barbershop[];
}

export const BarbershopGrid: FC<BarbershopGridProps> = ({ barbershops }) => {
  return (
    <main className="grid grid-cols-1 gap-x-6 gap-y-8 bg-accent/20 px-4 py-6 md:grid-cols-2 md:px-8 xl:grid-cols-3 dark:bg-accent/20">
      {barbershops.map((barbershop) => (
        <BarbershopListCard key={barbershop._id} barbershop={barbershop} />
      ))}
    </main>
  );
};
