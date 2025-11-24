import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import { RefreshCcwIcon } from "lucide-react";
import type { FC } from "react";

import { Button } from "@/components/ui/button";

export const DefaultCatchBoundary: FC<ErrorComponentProps> = ({ error }) => {
  const router = useRouter();
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error(error);

  return (
    <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4">
      <ErrorComponent error={error} />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          onClick={() => {
            router.invalidate();
          }}
        >
          <RefreshCcwIcon className="size-3" />
          Intentar nuevamente
        </Button>
        {isRoot ? (
          <Button variant="secondary" asChild>
            <Link to="/">Inicio</Link>
          </Button>
        ) : (
          <Button variant="secondary" asChild>
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault();
                window.history.back();
              }}
            >
              Volver
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
};
