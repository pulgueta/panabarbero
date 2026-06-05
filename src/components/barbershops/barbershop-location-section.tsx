import type { Barbershop } from "@convex/schema";
import {
  MapPinIcon,
  NavigationArrowIcon,
  PersonSimpleWalkIcon,
} from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Map as MapCanvas,
  MapControls,
  MapMarker,
  type MapRef,
  MapRoute,
  type MapViewport,
  MarkerContent,
  MarkerLabel,
} from "@/components/ui/map";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { useBarbershopLocation } from "@/hooks/barbershop/use-barbershop-metadata";
import type { Coord } from "@/hooks/use-directions";
import {
  getCachedRouteQueryOptions,
  useDrivingRoute,
} from "@/hooks/use-directions";
import { useGeolocation } from "@/hooks/use-geolocation";

const distanceFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 1,
});

/** Bounding box `[[minLng, minLat], [maxLng, maxLat]]` covering every point. */
function boundsForPoints(
  points: [number, number][],
): [[number, number], [number, number]] {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const [lng, lat] of points) {
    if (lng < minLng) minLng = lng;
    if (lat < minLat) minLat = lat;
    if (lng > maxLng) maxLng = lng;
    if (lat > maxLat) maxLat = lat;
  }

  return [
    [minLng, minLat],
    [maxLng, maxLat],
  ];
}

interface DrivingRoute {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][];
}

interface ResolvedRoute {
  route: DrivingRoute;
}

type DirectionsState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; resolved: ResolvedRoute };

interface BarbershopLocationSectionProps {
  barbershopId: Barbershop["_id"];
  barbershopName: string;
}

export function BarbershopLocationSection({
  barbershopId,
  barbershopName,
}: BarbershopLocationSectionProps) {
  const { data: location } = useBarbershopLocation(barbershopId);
  const geo = useGeolocation();
  const queryClient = useQueryClient();
  const { mutateAsync: fetchRoute } = useDrivingRoute();

  const [state, setState] = useState<DirectionsState>({ phase: "idle" });
  const [viewport, setViewport] = useState<Partial<MapViewport>>({});
  const mapRef = useRef<MapRef>(null);

  const lat = location?.latitude;
  const lng = location?.longitude;

  if (lat === undefined || lng === undefined) return null;

  // User-initiated: prompt for the visitor's location, then resolve the route —
  // Convex cache first, falling back to the OSRM action (which persists the
  // result for next time).
  const onCalculate = async () => {
    const coords = await geo.request();
    if (!coords) return;

    const from: Coord = { latitude: coords.lat, longitude: coords.lng };
    const to: Coord = { latitude: lat, longitude: lng };

    setState({ phase: "loading" });
    try {
      const cached = await queryClient.fetchQuery(
        getCachedRouteQueryOptions(from, to),
      );

      let route: DrivingRoute | null = cached;
      if (!route) {
        const res = await fetchRoute({ from, to });
        route = res
          ? {
              distanceMeters: res.distanceMeters,
              durationSeconds: res.durationSeconds,
              geometry: res.geometry,
            }
          : null;
      }

      if (!route) {
        setState({ phase: "idle" });
        return;
      }

      setState({ phase: "done", resolved: { route } });

      // Frame the whole route: fit the map to the polyline plus both endpoints,
      // with padding, so it's centered and zoomed to read comfortably.
      mapRef.current?.fitBounds(
        boundsForPoints([
          ...route.geometry,
          [from.longitude, from.latitude],
          [to.longitude, to.latitude],
        ]),
        { padding: 56, maxZoom: 16, duration: 700 },
      );
    } catch {
      setState({ phase: "idle" });
      toast.error("No se pudo calcular la ruta.");
    }
  };

  const resolved = state.phase === "done" ? state.resolved : null;
  const computing = state.phase === "loading";
  const route = resolved?.route;
  const distanceLabel = route
    ? route.distanceMeters < 1000
      ? `${Math.round(route.distanceMeters)} m`
      : `${distanceFormatter.format(route.distanceMeters / 1000)} km`
    : null;
  const minutes = route ? Math.round(route.durationSeconds / 60) : null;

  // Start centered on the shop; once a route is computed `fitBounds` frames it
  // imperatively and `onViewportChange` captures the result into `viewport`.
  const mapViewport: Partial<MapViewport> = viewport.center
    ? viewport
    : { center: [lng, lat], zoom: 14 };

  return (
    <>
      <Separator className="my-6" />

      <section className="space-y-4">
        <h2 className="text-balance font-semibold text-xl tracking-tight">
          Cómo llegar
        </h2>

        <div className="relative h-96 w-full overflow-hidden rounded-xl border">
          <MapCanvas
            onViewportChange={setViewport}
            ref={mapRef}
            viewport={mapViewport}
          >
            <MapMarker latitude={lat} longitude={lng}>
              <MarkerContent className="-translate-y-1/2">
                <MapPinIcon className="size-8 text-primary" weight="fill" />
              </MarkerContent>
              <MarkerLabel>{barbershopName}</MarkerLabel>
            </MapMarker>

            {geo.coords && (
              <MapMarker latitude={geo.coords.lat} longitude={geo.coords.lng}>
                <MarkerContent>
                  <span className="block size-3.5 rounded-full border-2 border-background bg-blue-500 shadow" />
                </MarkerContent>
              </MapMarker>
            )}

            {route && (
              <MapRoute
                color="#b3342b"
                coordinates={route.geometry}
                width={5}
              />
            )}

            <MapControls />
          </MapCanvas>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            disabled={computing || geo.status === "prompting"}
            onClick={onCalculate}
            variant="outline"
          >
            {computing || geo.status === "prompting" ? (
              <Spinner />
            ) : (
              <NavigationArrowIcon weight="fill" />
            )}
            Calcular distancia desde mi ubicación
          </Button>

          {distanceLabel && minutes !== null && (
            <span className="inline-flex items-center gap-1.5 font-medium text-sm">
              <PersonSimpleWalkIcon className="size-4 text-muted-foreground" />A{" "}
              {distanceLabel} · ~{minutes} min en carro
            </span>
          )}
        </div>

        {geo.status === "denied" && (
          <p className="text-muted-foreground text-sm">
            Activa los permisos de ubicación para calcular la distancia.
          </p>
        )}
      </section>
    </>
  );
}
