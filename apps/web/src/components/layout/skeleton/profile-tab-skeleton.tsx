import { Skeleton } from "@/components/ui/skeleton";

export const ProfileTabSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
    {Array.from({ length: 3 }).map((_, index) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: key is not needed for skeleton
      <Skeleton key={index} className="h-52 w-full pt-2" />
    ))}
  </div>
);
