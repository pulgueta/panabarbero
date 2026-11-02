import type { ComponentProps, FC } from "react";

import { cn } from "@/lib/utils";

type DashboardPageProps = ComponentProps<"div">;

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
const DashboardPage: FC<DashboardPageProps> = ({ className, ...props }) => {
  return (
    <div
      data-slot="dashboard-page"
      className={cn("space-y-6", className)}
      {...props}
    />
  );
};

type DashboardPageHeaderProps = ComponentProps<"header">;

/**
 * Header row: heading on the left, primary action on the right. Stacks on
 * mobile (action drops below the heading) and splits from `sm` up. The action
 * keeps its top edge aligned with the title rather than centering against a
 * two-line description.
 */
const DashboardPageHeader: FC<DashboardPageHeaderProps> = ({
  className,
  ...props
}) => {
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
};

interface DashboardPageHeadingProps {
  title: string;
  description?: string;
  className?: string;
}

/**
 * Title + optional description. Owns the shared view-transition names so
 * dashboard navigations crossfade the heading (matches the names the routes
 * used before this component existed).
 */
const DashboardPageHeading: FC<DashboardPageHeadingProps> = ({
  title,
  description,
  className,
}) => {
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
};

type DashboardPageActionsProps = ComponentProps<"div">;

/** Right-aligned action slot for the header (a single primary action + optional secondary). */
const DashboardPageActions: FC<DashboardPageActionsProps> = ({
  className,
  ...props
}) => {
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
};

type DashboardPageStatsProps = ComponentProps<"div">;

/** KPI strip. Two columns on mobile, four from `lg` up, per DESIGN.md §7. */
const DashboardPageStats: FC<DashboardPageStatsProps> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="dashboard-page-stats"
      className={cn("grid grid-cols-2 gap-4 lg:grid-cols-4", className)}
      {...props}
    />
  );
};

type DashboardPageContentProps = ComponentProps<"div">;

/** Work surface (table / calendar / grid). `min-w-0` keeps wide tables from overflowing the flex/grid parent. */
const DashboardPageContent: FC<DashboardPageContentProps> = ({
  className,
  ...props
}) => {
  return (
    <div
      data-slot="dashboard-page-content"
      className={cn("min-w-0", className)}
      {...props}
    />
  );
};

export {
  DashboardPage,
  DashboardPageActions,
  DashboardPageContent,
  DashboardPageHeader,
  DashboardPageHeading,
  DashboardPageStats,
};
