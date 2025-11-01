import type { ErrorComponentProps } from "@tanstack/react-router";
import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from "@tanstack/react-router";
import type { FC } from "react";

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
        <button
          type="button"
          onClick={() => {
            router.invalidate();
          }}
          className="rounded-sm bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
        >
          Intentar nuevamente
        </button>
        {isRoot ? (
          <Link
            to="/"
            className="rounded-sm bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
          >
            Inicio
          </Link>
        ) : (
          <Link
            to="/"
            className="rounded-sm bg-gray-600 px-2 py-1 font-extrabold text-white uppercase dark:bg-gray-700"
            onClick={(e) => {
              e.preventDefault();
              window.history.back();
            }}
          >
            Volver
          </Link>
        )}
      </div>
    </div>
  );
};
