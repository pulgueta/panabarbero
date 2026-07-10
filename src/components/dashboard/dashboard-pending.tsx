import { Skeleton } from "@/components/ui/skeleton";

/** Route-level pending state for dashboard pages — mirrors the page anatomy
 * (title row → stat row → work surface) instead of a centered spinner. */
export const DashboardPending = () => (
  <section className="space-y-6">
    <div className="space-y-2">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Skeleton className="h-24" />
      <Skeleton className="h-24" />
      <Skeleton className="hidden h-24 lg:block" />
      <Skeleton className="hidden h-24 lg:block" />
    </div>
    <Skeleton className="h-64 w-full" />
  </section>
);
