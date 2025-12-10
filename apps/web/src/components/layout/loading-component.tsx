import { Spinner } from "@/components/ui/spinner";
import { BorderContainer } from "./border-container";

export const LoadingComponent = () => {
  return (
    <BorderContainer className="flex min-h-[calc(100dvh-65px)] items-center justify-center">
      <div className="flex flex-col items-center justify-center gap-2">
        <Spinner className="size-6" />
        <p className="text-pretty text-center text-muted-foreground text-sm">
          Cargando...
        </p>
      </div>
    </BorderContainer>
  );
};
