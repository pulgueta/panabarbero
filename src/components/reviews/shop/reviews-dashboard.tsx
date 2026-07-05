import { api } from "@convex/_generated/api";
import type { Barbershop } from "@convex/schema";
import type { ColumnFiltersState, SortingState } from "@tanstack/react-table";
import { usePaginatedQuery } from "convex/react";
import { type FC, useMemo, useState } from "react";

import {
  DataTable,
  DataTableContent,
  DataTableSkeleton,
} from "@/components/table/data-table";
import { DataTablePagination } from "@/components/table/data-table-pagination";
import { useServerDataTable } from "@/components/table/use-server-data-table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type ShopReviewRow,
  useShopRatingTrend,
  useShopReviewBreakdown,
  useShopReviewStats,
} from "@/hooks/use-reviews";

import { getShopReviewColumns } from "./columns";
import { RatingDistribution } from "./rating-distribution";
import { RatingTrend } from "./rating-trend";
import { ReviewBreakdownList } from "./review-breakdown-list";
import { ReviewDetailModal } from "./review-detail-modal";
import { ReviewStatsCards } from "./review-stats-cards";
import { ReviewsEmpty } from "./reviews-empty";
import {
  type ReviewFilterKey,
  ReviewsFilter,
  reviewFilterToArgs,
} from "./reviews-filter";

interface ReviewsDashboardProps {
  barbershopId: Barbershop["_id"];
}

const CardSkeleton = () => <Skeleton className="h-52" />;

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
        <ReviewStatsCards stats={stats} />
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {stats ? (
          <RatingDistribution distribution={stats.distribution} />
        ) : (
          <CardSkeleton />
        )}
        {trend ? <RatingTrend points={trend} /> : <CardSkeleton />}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {breakdown ? (
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
        ) : (
          <Skeleton className="h-40" />
        )}
        {breakdown ? (
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
        ) : (
          <Skeleton className="h-40" />
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

      <ReviewDetailModal review={selected} onClose={() => setSelected(null)} />
    </div>
  );
};
