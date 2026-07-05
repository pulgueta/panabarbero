import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

/**
 * Composable layout for a dashboard section. The shell (`route.tsx`) owns the
 * horizontal gutter and full width; this only structures a page's vertical
 * rhythm and its header/stats/content regions. Compose the pieces you need —
 * omit `Stats` when there are none, omit `Actions` when the header has no
 * primary action.
 *
 * ```tsx
 * <DashboardPage>
 *   <DashboardPageHeader>
 *     <DashboardPageHeading title="Inventario" description="Controla el stock…" />
 *     <DashboardPageActions>
 *       <Button>Nuevo producto</Button>
 *     </DashboardPageActions>
 *   </DashboardPageHeader>
 *   <DashboardPageStats>…</DashboardPageStats>
 *   <DashboardPageContent>…</DashboardPageContent>
 * </DashboardPage>
 * ```
 */
function DashboardPage({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-page"
      className={cn("space-y-6", className)}
      {...props}
    />
  );
}

/**
 * Header row: heading on the left, primary action on the right. Stacks on
 * mobile (action drops below the heading) and splits from `sm` up. The action
 * keeps its top edge aligned with the title rather than centering against a
 * two-line description.
 */
function DashboardPageHeader({
  className,
  ...props
}: ComponentProps<"header">) {
  return (
    <header
      data-slot="dashboard-page-header"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Title + optional description. Owns the shared view-transition names so
 * dashboard navigations crossfade the heading (matches the names the routes
 * used before this component existed).
 */
function DashboardPageHeading({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", className)}>
      <h1
        className="text-balance font-semibold text-xl tracking-tight"
        style={{ viewTransitionName: `dashboard-${title}` }}
      >
        {title}
      </h1>
      {description ? (
        <p
          className="max-w-prose text-pretty text-muted-foreground text-sm"
          style={{ viewTransitionName: `dashboard-${title}-description` }}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}

/** Right-aligned action slot for the header (a single primary action + optional secondary). */
function DashboardPageActions({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-page-actions"
      className={cn(
        "flex shrink-0 items-center gap-2 max-sm:w-full max-sm:*:flex-1",
        className,
      )}
      {...props}
    />
  );
}

/** KPI strip. Two columns on mobile, four from `lg` up, per DESIGN.md §7. */
function DashboardPageStats({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-page-stats"
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-3", className)}
      {...props}
    />
  );
}

/** Work surface (table / calendar / grid). `min-w-0` keeps wide tables from overflowing the flex/grid parent. */
function DashboardPageContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="dashboard-page-content"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
}

export {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
  DashboardPageStats,
};
