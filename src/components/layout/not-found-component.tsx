import { InfoIcon } from "@phosphor-icons/react";
import { useRouter } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export const NotFoundComponent = () => {
  const router = useRouter();

  return (
    <Empty className="min-h-[calc(100dvh-65px)] bg-gradient-to-b from-30% from-muted/50 to-background">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <InfoIcon />
        </EmptyMedia>
        <EmptyTitle className="text-balance font-bold text-xl tracking-tight md:text-3xl">
          Página no encontrada
        </EmptyTitle>
        <EmptyDescription className="text-pretty">
          La página que estás buscando no existe.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button
          variant="outline"
          onClick={() =>
            router.navigate({
              to: "/",
            })
          }
        >
          Ir a la página de inicio
        </Button>
      </EmptyContent>
    </Empty>
  );
};
