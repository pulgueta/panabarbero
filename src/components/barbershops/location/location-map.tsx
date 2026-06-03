import { MapPinIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import {
  Map as MapCanvas,
  MapControls,
  MapMarker,
  type MapViewport,
  MarkerContent,
} from "@/components/ui/map";
import { useLocation } from "./location-provider";

/** Approximate geographic center of Colombia, used until a pin is set. */
const COLOMBIA_CENTER: [number, number] = [-74.2973, 4.5709];

export function LocationMap() {
  const { state, actions } = useLocation();

  const [viewport, setViewport] = useState<Partial<MapViewport>>(() => ({
    center: state.coords
      ? [state.coords.lng, state.coords.lat]
      : COLOMBIA_CENTER,
    zoom: state.coords ? 13 : 4.5,
  }));

  // Recenter when the pin moves via geolocation or the locate control.
  useEffect(() => {
    const coords = state.coords;
    if (!coords) return;
    setViewport((prev) => ({
      ...prev,
      center: [coords.lng, coords.lat],
      zoom: Math.max(prev.zoom ?? 0, 13),
    }));
  }, [state.coords]);

  return (
    <div className="h-60 w-full overflow-hidden rounded-xl border">
      <MapCanvas onViewportChange={setViewport} viewport={viewport}>
        {state.coords ? (
          <MapMarker
            draggable
            latitude={state.coords.lat}
            longitude={state.coords.lng}
            onDragEnd={(lngLat) =>
              actions.setPin({ lat: lngLat.lat, lng: lngLat.lng })
            }
          >
            <MarkerContent className="-translate-y-1/2">
              <MapPinIcon className="size-7 text-primary" weight="fill" />
            </MarkerContent>
          </MapMarker>
        ) : null}
        <MapControls
          onLocate={(coords) =>
            actions.setPin({ lat: coords.latitude, lng: coords.longitude })
          }
          showLocate
        />
      </MapCanvas>
    </div>
  );
}
