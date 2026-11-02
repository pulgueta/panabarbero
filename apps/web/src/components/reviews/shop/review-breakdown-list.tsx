import { StarIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { Card, CardHeader, CardTitle } from "@/components/ui/card";

export interface BreakdownItem {
  key: string;
  name: string;
  average: number;
  count: number;
}

interface ReviewBreakdownListProps {
  title: string;
  items: BreakdownItem[];
  emptyLabel: string;
}

/**
 * A titled panel listing averages by service or by barber. Hairline row
 * separators, no cards-in-cards — the rows are plain flex rows inside the one
 * enclosing card.
 */
export const ReviewBreakdownList: FC<ReviewBreakdownListProps> = ({
  title,
  items,
  emptyLabel,
}) => (
  <Card>
    <CardHeader className="pb-0">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    {items.length === 0 ? (
      <p className="px-4 text-muted-foreground text-sm">{emptyLabel}</p>
    ) : (
      <ul className="divide-y divide-border border-t">
        {items.map((item) => (
          <li
            key={item.key}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="min-w-0 truncate text-sm">{item.name}</span>
            <span className="flex shrink-0 items-center gap-1.5 text-sm tabular-nums">
              <span className="font-medium">{item.average.toFixed(1)}</span>
              <StarIcon
                weight="fill"
                aria-hidden
                className="size-4 text-amber-500"
              />
              <span className="text-muted-foreground">({item.count})</span>
            </span>
          </li>
        ))}
      </ul>
    )}
  </Card>
);
