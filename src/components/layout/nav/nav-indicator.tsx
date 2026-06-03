import { m, useReducedMotion } from "motion/react";

import { cn } from "@/lib/utils";

interface NavIndicatorProps {
  /** Distinct per bar so the bottom and desktop indicators never share state. */
  layoutId: string;
  variant: "pill" | "underline";
}

/**
 * Shared active indicator. Motion animates the layout transition between the
 * previously- and currently-active item via `layoutId`.
 *
 * `useReducedMotion()` is a runtime guard: CSS `prefers-reduced-motion` can't
 * stop a JS layout spring, so we collapse the transition to `{ duration: 0 }`.
 *
 * Must be rendered inside a `LazyMotion features={domMax}` tree (layout
 * animations are not part of `domAnimation`).
 */
export function NavIndicator({ layoutId, variant }: NavIndicatorProps) {
  const reduceMotion = useReducedMotion();

  return (
    <m.span
      aria-hidden="true"
      layoutId={layoutId}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 480, damping: 38 }
      }
      className={cn(
        "pointer-events-none absolute",
        variant === "pill"
          ? "inset-x-1.5 inset-y-1 -z-10 rounded-xl bg-primary/10"
          : "inset-x-0 -bottom-px h-0.5 rounded-full bg-primary",
      )}
    />
  );
}
