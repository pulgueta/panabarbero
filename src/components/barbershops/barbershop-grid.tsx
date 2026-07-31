import type { FC } from "react";

import type { BarbershopListItem } from "./barbershop-list-card";
import { BarbershopListCard } from "./barbershop-list-card";
import { BarbershopListRow } from "./barbershop-list-row";

/** "gallery" = media cards; "grid" = compact rows in a two-column grid. */
export type BarbershopListView = "gallery" | "grid";

interface BarbershopGridProps {
  barbershops: BarbershopListItem[];
  view: BarbershopListView;
}

export const BarbershopGrid: FC<BarbershopGridProps> = ({
  barbershops,
  view,
}) => {
  if (view === "grid") {
    return (
      <main className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {barbershops.map((barbershop) => (
          <BarbershopListRow barbershop={barbershop} key={barbershop._id} />
        ))}
      </main>
    );
  }

  return (
    <main className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {barbershops.map((barbershop) => (
        <BarbershopListCard barbershop={barbershop} key={barbershop._id} />
      ))}
    </main>
  );
};
