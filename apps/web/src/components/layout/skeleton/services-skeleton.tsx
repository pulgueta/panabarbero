import { Skeleton } from "@/components/ui/skeleton";

export const ServicesSkeleton = () => (
  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      <Skeleton key={index} className="h-48 w-full rounded-lg" />
    ))}
  </div>
);
