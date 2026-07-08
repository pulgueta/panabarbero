import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { usePaginatedQuery } from "convex/react";
import type { FC } from "react";
import { lazy, Suspense, useMemo, useState } from "react";

import {
  DataTable,
  DataTableContent,
  DataTableSkeleton,
} from "@/components/table/data-table";
import { DataTablePagination } from "@/components/table/data-table-pagination";
import { useServerDataTable } from "@/components/table/use-server-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import type { ShopReviewRow } from "@/hooks/use-reviews";
import {
  useShopRatingTrend,
  useShopReviewBreakdown,
  useShopReviewStats,
} from "@/hooks/use-reviews";
import { getShopReviewColumns } from "./columns";
import { ReviewsEmpty } from "./reviews-empty";
import {
  type ReviewFilterKey,
  ReviewsFilter,
  reviewFilterToArgs,
} from "./reviews-filter";

const RatingTrend = lazy(() =>
  import("./rating-trend").then((module) => ({
    default: module.RatingTrend,
  })),
);
const RatingDistribution = lazy(() =>
  import("./rating-distribution").then((module) => ({
    default: module.RatingDistribution,
  })),
);
const ReviewBreakdownList = lazy(() =>
  import("./review-breakdown-list").then((module) => ({
    default: module.ReviewBreakdownList,
  })),
);
const ReviewDetailModal = lazy(() =>
  import("./review-detail-modal").then((module) => ({
    default: module.ReviewDetailModal,
  })),
);
const ReviewStatsCards = lazy(() =>
  import("./review-stats-cards").then((module) => ({
    default: module.ReviewStatsCards,
  })),
);

interface ReviewsDashboardProps {
  barbershopId: Barbershop["_id"];
}

const CardSkeleton = () => <Skeleton className="h-52" />;

// Shared between the data-pending branch and the lazy-chunk Suspense
// fallback so a cold visit shows one continuous skeleton.
const STATS_SKELETON = (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    <Skeleton className="h-28" />
    <Skeleton className="h-28" />
    <Skeleton className="h-28" />
    <Skeleton className="h-28" />
  </div>
);

const BREAKDOWN_SKELETON = <Skeleton className="h-40" />;

const TABLE_EMPTY = (
  <p className="text-muted-foreground text-sm">
    No hay reseñas que coincidan con este filtro.
  </p>
);

/**
 * Owner "Reseñas" analytics surface: KPI strip, star distribution + 6-month
 * trend, per-service / per-barber breakdown, and the paginated, filterable
 * review feed. The feed drives the whole-page empty decision (it includes
 * pending reviews the stats aggregate omits).
 */
export const ReviewsDashboard: FC<ReviewsDashboardProps> = ({
  barbershopId,
}) => {
  const [filter, setFilter] = useState<ReviewFilterKey>("all");
  const [selected, setSelected] = useState<ShopReviewRow | null>(null);

  // Table state is owned here because it feeds the Convex args; this section
  // filters through the unified control, so sort/column-filter/search stay empty.
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const { results, status, loadMore } = usePaginatedQuery(
    api.reviews.listForShop,
    { barbershop: { id: barbershopId }, ...reviewFilterToArgs(filter) },
    { initialNumItems: 20 },
  );

  const columns = useMemo(
    () => getShopReviewColumns({ onView: setSelected }),
    [],
  );

  const table = useServerDataTable({
    data: results,
    columns,
    sorting,
    onSortingChange: setSorting,
    columnFilters,
    onColumnFiltersChange: setColumnFilters,
    globalFilter,
    onGlobalFilterChange: setGlobalFilter,
  });

  const { data: stats } = useShopReviewStats(barbershopId);
  const { data: trend } = useShopRatingTrend(barbershopId);
  const { data: breakdown } = useShopReviewBreakdown(barbershopId);

  const noReviews =
    filter === "all" && status === "Exhausted" && results.length === 0;

  if (noReviews) {
    return <ReviewsEmpty />;
  }

  return (
    <div className="space-y-6">
      {stats ? (
        <Suspense fallback={STATS_SKELETON}>
          <ReviewStatsCards stats={stats} />
        </Suspense>
      ) : (
        STATS_SKELETON
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {stats ? (
          <Suspense fallback={<CardSkeleton />}>
            <RatingDistribution distribution={stats.distribution} />
          </Suspense>
        ) : (
          <CardSkeleton />
        )}
        {trend ? (
          <Suspense fallback={<CardSkeleton />}>
            <RatingTrend points={trend} />
          </Suspense>
        ) : (
          <CardSkeleton />
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {breakdown ? (
          <Suspense fallback={BREAKDOWN_SKELETON}>
            <ReviewBreakdownList
              title="Por servicio"
              emptyLabel="Sin reseñas por servicio todavía."
              items={breakdown.byService.map((service) => ({
                key: service.serviceName,
                name: service.serviceName,
                average: service.average,
                count: service.count,
              }))}
            />
          </Suspense>
        ) : (
          BREAKDOWN_SKELETON
        )}
        {breakdown ? (
          <Suspense fallback={BREAKDOWN_SKELETON}>
            <ReviewBreakdownList
              title="Por barbero"
              emptyLabel="Sin reseñas por barbero todavía."
              items={breakdown.byBarber.map((barber) => ({
                key: barber.barbershopMemberId,
                name: barber.name,
                average: barber.average,
                count: barber.count,
              }))}
            />
          </Suspense>
        ) : (
          BREAKDOWN_SKELETON
        )}
      </div>

      <div className="space-y-4">
        <ReviewsFilter value={filter} onChange={setFilter} />
        {status === "LoadingFirstPage" ? (
          <DataTableSkeleton columns={7} rows={6} />
        ) : (
          <DataTable table={table} server={{ status, loadMore, pageSize: 20 }}>
            <DataTableContent empty={TABLE_EMPTY} />
            <DataTablePagination />
          </DataTable>
        )}
      </div>

      <Suspense fallback={null}>
        <ReviewDetailModal
          review={selected}
          onClose={() => setSelected(null)}
        />
      </Suspense>
    </div>
  );
};
