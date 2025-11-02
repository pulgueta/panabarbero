import { Spinner } from "@/components/ui/spinner";

export const LoadingComponent = () => {
  return (
    <div className="container mx-auto flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center gap-8 border-x p-6">
      <div className="flex flex-col items-center justify-center gap-2">
        <Spinner className="size-6" />
        <p className="text-pretty text-center text-muted-foreground text-sm">
          Cargando...
        </p>
      </div>
    </div>
  );
};
