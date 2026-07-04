import { MapPinIcon, NavigationArrowIcon } from "@phosphor-icons/react";
import { lazy, Suspense, useState } from "react";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useLocation } from "./location-provider";

const LocationMap = lazy(() =>
  import("./location-map").then((mod) => ({ default: mod.LocationMap })),
);

const SESSION_KEY = "pb-location-firstrun-dismissed";

/**
 * Non-blocking first-run location prompt. Replaces the old blocking dialog:
 * the listing stays usable, geolocation is opt-in on a user gesture, and
 * manual selection is always one tap away.
 */
export function LocationFirstRun() {
  const { state, actions, meta } = useLocation();
  const { trigger } = useWebHaptics();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });

  if (meta.hasLocation || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  };

  const handleUseLocation = () => {
    trigger();
    actions.requestGeolocation();
  };

  const handleConfirm = () => {
    trigger();
    actions.confirmPin();
  };

  const isLocating = state.status === "prompting";
  const hasPin = state.status === "granted" && Boolean(state.coords);
  const failed =
    state.status === "denied" ||
    state.status === "unsupported" ||
    state.status === "error";

  return (
    <div className="mx-auto w-full max-w-3xl rounded-xl border bg-card p-4">
      {hasPin ? (
        <div className="space-y-3">
          <Suspense fallback={<Skeleton className="h-60 w-full rounded-xl" />}>
            <LocationMap />
          </Suspense>
          <p className="text-pretty text-muted-foreground text-sm">
            {state.pendingMatch?.ciudad ? (
              <>
                Detectamos{" "}
                <span className="font-medium text-foreground">
                  {state.pendingMatch.ciudad}, {state.pendingMatch.departamento}
                </span>
                . Arrastra el pin si necesitas ajustarlo.
              </>
            ) : (
              "Arrastra el pin hasta tu zona o elige tu ciudad abajo."
            )}
          </p>
          <div className="flex flex-col gap-2 md:flex-row md:justify-end">
            <Button onClick={dismiss} size="sm" variant="ghost">
              Elegir manualmente
            </Button>
            <Button
              disabled={!state.pendingMatch?.ciudad}
              onClick={handleConfirm}
              size="sm"
            >
              <MapPinIcon weight="fill" />
              Confirmar ubicación
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <NavigationArrowIcon className="size-4" weight="fill" />
            </span>
            <div className="space-y-0.5">
              <p className="font-medium text-sm">¿Ver barberías cerca de ti?</p>
              <p className="text-pretty text-muted-foreground text-sm">
                {failed
                  ? "No pudimos obtener tu ubicación. Elígela manualmente."
                  : "Usa tu ubicación o elige tu ciudad para empezar."}
              </p>
            </div>
          </div>

          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row">
            {!failed && (
              <Button disabled={isLocating} onClick={handleUseLocation}>
                {isLocating && <Spinner />}
                Usar mi ubicación
              </Button>
            )}
            <Button onClick={dismiss} variant="outline">
              Elegir manualmente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
