import { StarIcon } from "@phosphor-icons/react";
import type { FC } from "react";

import { cn } from "@/lib/utils";

interface StarRatingProps {
  /** Current value. Supports fractional values (e.g. 4.3) in read-only mode. */
  value: number;
  /** When provided (and not read-only), the stars become an interactive 1-5 picker. */
  onChange?: (value: number) => void;
  readOnly?: boolean;
  /** Tailwind size utility applied to each star (default `size-5`). */
  starClassName?: string;
  className?: string;
  "aria-label"?: string;
}

const STARS = [1, 2, 3, 4, 5] as const;

/**
 * Star rating used both as a read-only display (fractional fill for averages)
 * and as an accessible interactive 1-5 picker (when `onChange` is passed).
 */
export const StarRating: FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly,
  starClassName = "size-5",
  className,
  "aria-label": ariaLabel,
}) => {
  const interactive = !!onChange && !readOnly;

  if (interactive) {
    return (
      <div
        role="radiogroup"
        aria-label={ariaLabel ?? "Calificación de 1 a 5 estrellas"}
        className={cn("flex items-center gap-1", className)}
      >
        {STARS.map((n) => (
          // biome-ignore lint/a11y/useSemanticElements: star buttons implement the W3C ARIA radio pattern for a custom rating control
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} ${n === 1 ? "estrella" : "estrellas"}`}
            onClick={() => onChange?.(n)}
            className="rounded-md p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <StarIcon
              weight={n <= value ? "fill" : "regular"}
              className={cn(
                starClassName,
                n <= value ? "text-amber-500" : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
    );
  }

  // Read-only display: a real text label for screen readers, with the composed
  // fractional stars marked decorative (`aria-hidden`). Cleaner than `role="img"`
  // — AT announces "Calificación 4.3 de 5", not an image.
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      <span className="sr-only">
        {ariaLabel ?? `Calificación ${value.toFixed(1)} de 5`}
      </span>
      <span aria-hidden="true" className="flex items-center gap-0.5">
        {STARS.map((n) => {
          const fraction = Math.max(0, Math.min(1, value - (n - 1)));

          return (
            <span key={n} className="relative inline-flex">
              <StarIcon
                weight="regular"
                className={cn(starClassName, "text-muted-foreground")}
              />
              {fraction > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fraction * 100}%` }}
                >
                  <StarIcon
                    weight="fill"
                    className={cn(starClassName, "text-amber-500")}
                  />
                </span>
              )}
            </span>
          );
        })}
      </span>
    </div>
  );
};
