import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

export const BarbershopLoadingGrid = () => {
  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-accent/20 px-4 dark:bg-accent/20">
      <div className="flex flex-col items-center justify-center gap-2">
        <Spinner className="size-6" />
        <p className="text-pretty text-center text-muted-foreground text-sm">
          Cargando barberías...
        </p>
      </div>
      <div className="grid w-full grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: key is not needed for skeleton
          <Skeleton key={index} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
};
