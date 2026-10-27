import { StarIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import type { ShopReviewStatus, ShopReviewsFilters } from "@/hooks/use-reviews";
import { cn } from "@/lib/utils";

/**
 * One key for the single, unified review filter. `rating` and `status` are
 * mutually-exclusive server-side (status wins), so the dashboard exposes them
 * as one flat choice instead of two independent filter chips.
 */
export type ReviewFilterKey =
  | "all"
  | "5"
  | "4"
  | "3"
  | "2"
  | "1"
  | "published"
  | "flagged"
  | "pending";

/** Map a filter key to the mutually-exclusive `{ rating } | { status }` args. */
export function reviewFilterToArgs(key: ReviewFilterKey): ShopReviewsFilters {
  switch (key) {
    case "all":
      return {};
    case "published":
    case "flagged":
    case "pending":
      return { status: key satisfies ShopReviewStatus };
    default:
      return { rating: Number(key) };
  }
}

type Option =
  | { key: ReviewFilterKey; label: string; rating: number }
  | { key: ReviewFilterKey; label: string; rating?: undefined };

const OPTIONS: Option[] = [
  { key: "all", label: "Todas" },
  { key: "5", label: "5 estrellas", rating: 5 },
  { key: "4", label: "4 estrellas", rating: 4 },
  { key: "3", label: "3 estrellas", rating: 3 },
  { key: "2", label: "2 estrellas", rating: 2 },
  { key: "1", label: "1 estrella", rating: 1 },
  { key: "published", label: "Publicadas" },
  { key: "flagged", label: "Marcadas" },
  { key: "pending", label: "Pendientes" },
];

interface ReviewsFilterProps {
  value: ReviewFilterKey;
  onChange: (value: ReviewFilterKey) => void;
}

/**
 * The single unified filter for the reviews feed — a pill radiogroup (DESIGN.md
 * §7 filter style). Each option resolves to exactly one server arg (`rating` OR
 * `status`), never both.
 */
export const ReviewsFilter: FC<ReviewsFilterProps> = ({ value, onChange }) => (
  <div
    role="radiogroup"
    aria-label="Filtrar reseñas"
    className="flex flex-wrap items-center gap-1"
  >
    {OPTIONS.map((option) => {
      const selected = option.key === value;

      return (
        // biome-ignore lint/a11y/useSemanticElements: pill group implements the ARIA radio pattern for a single-select filter
        <button
          key={option.key}
          type="button"
          role="radio"
          aria-checked={selected}
          aria-label={option.label}
          onClick={() => onChange(option.key)}
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            selected
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.rating ? (
            <>
              <span className="tabular-nums">{option.rating}</span>
              <StarIcon
                weight="fill"
                aria-hidden
                className="size-3 text-amber-500"
              />
            </>
          ) : (
            option.label
          )}
        </button>
      );
    })}
  </div>
);
