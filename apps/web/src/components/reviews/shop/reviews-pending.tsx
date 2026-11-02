import { DataTableSkeleton } from "@/components/table/data-table";
import { Skeleton } from "@/components/ui/skeleton";

/** Stats strip + charts row + breakdown row + table — mirrors the loaded layout. */
export const ReviewsContentSkeleton = () => (
  <div className="space-y-6" aria-hidden>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-52" />
      <Skeleton className="h-52" />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Skeleton className="h-40" />
      <Skeleton className="h-40" />
    </div>
    <DataTableSkeleton columns={7} rows={6} />
  </div>
);

/**
 * Route-level pending state — title row above the content skeleton so
 * navigating to Reseñas doesn't shift layout.
 */
export const ReviewsPending = () => (
  <section className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
    <ReviewsContentSkeleton />
  </section>
);
