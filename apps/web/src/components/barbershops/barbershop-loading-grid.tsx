import { Skeleton } from "@/components/ui/skeleton";

export const BarbershopLoadingGrid = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="grid w-full grid-cols-1 gap-x-6 gap-y-8 pb-16 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: key is not needed for skeleton
          <Skeleton key={index} className="h-56 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
};
