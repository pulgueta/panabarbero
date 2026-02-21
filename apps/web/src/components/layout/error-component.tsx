import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link, useRouter } from "@tanstack/react-router";
import { AlertTriangle, RefreshCcwIcon } from "lucide-react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { BorderContainer } from "./border-container";

export const DefaultCatchBoundary: FC<ErrorComponentProps> = ({ error }) => {
  const router = useRouter();

  console.error(error);

  return (
    <BorderContainer className="flex min-h-[calc(100dvh-65px)] items-center justify-center">
      <Empty className="max-w-xl rounded-3xl bg-destructive/10">
        <EmptyHeader>
          <EmptyMedia variant="icon" className="bg-destructive/20">
            <AlertTriangle className="size-6 text-destructive" />
          </EmptyMedia>
          <EmptyTitle className="font-bold">Error</EmptyTitle>
          <EmptyDescription>
            Ha ocurrido un error al cargar la página.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <p className="text-pretty italic">{error.message}</p>
          <Button
            variant="outline"
            onClick={() => {
              router.invalidate();
            }}
          >
            <RefreshCcwIcon className="size-3" />
            Intentar nuevamente
          </Button>

          <div className="flex items-center gap-2">
            <Button nativeButton={false} render={<Link to="/" />}>
              Inicio
            </Button>
            <Button
              variant="secondary"
              nativeButton={false}
              render={
                <Link
                  to="/"
                  onClick={(e) => {
                    e.preventDefault();
                    window.history.back();
                  }}
                />
              }
            >
              Volver
            </Button>
          </div>
        </EmptyContent>
      </Empty>
    </BorderContainer>
  );
};
