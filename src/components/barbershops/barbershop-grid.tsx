import type { Barbershop } from "@convex/schema";
import type { FC } from "react";

import { BarbershopListCard } from "./barbershop-list-card";

interface BarbershopGridProps {
  barbershops: Barbershop[];
}

export const BarbershopGrid: FC<BarbershopGridProps> = ({ barbershops }) => {
  return (
    <main className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {barbershops.map((barbershop) => (
        <BarbershopListCard key={barbershop._id} barbershop={barbershop} />
      ))}
    </main>
  );
};
