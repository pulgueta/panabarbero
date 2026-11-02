import { m, useReducedMotion } from "motion/react";

/**
 * Active-item underline for the desktop header nav. Motion animates the
 * layout transition between the previously- and currently-active item via
 * `layoutId`.
 *
 * `useReducedMotion()` is a runtime guard: CSS `prefers-reduced-motion` can't
 * stop a JS layout spring, so we collapse the transition to `{ duration: 0 }`.
 *
 * Must be rendered inside a `LazyMotion features={domMax}` tree (layout
 * animations are not part of `domAnimation`).
 */
export function NavIndicator({ layoutId }: { layoutId: string }) {
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
      className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary"
    />
  );
}
