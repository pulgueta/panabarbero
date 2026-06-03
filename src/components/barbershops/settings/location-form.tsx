import type { Barbershop } from "@convex/schema";
import { MapPinIcon } from "@phosphor-icons/react";
import type { FC } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { Button } from "@/components/ui/button";
import {
  Map as MapCanvas,
  MapControls,
  type MapViewport,
} from "@/components/ui/map";
import { Spinner } from "@/components/ui/spinner";
import {
  useBarbershopLocation,
  useBarbershopLocationActions,
} from "@/hooks/barbershop/use-barbershop-metadata";

/** Approximate geographic center of Colombia, used until a location is set. */
const COLOMBIA_CENTER: [number, number] = [-74.2973, 4.5709];

interface LocationFormProps {
  barbershop: Barbershop;
}

export const LocationForm: FC<LocationFormProps> = ({ barbershop }) => {
  const { data: location } = useBarbershopLocation(barbershop._id);
  const { setLocationMutation, removeLocationMutation } =
    useBarbershopLocationActions();
  const haptic = useWebHaptics();

  const [viewport, setViewport] = useState<Partial<MapViewport>>({});

  // Derive the map center from the stored location until the owner pans the
  // map (which fills `viewport.center`) — no init effect needed.
  const mapViewport: Partial<MapViewport> = viewport.center
    ? viewport
    : {
        center: location
          ? [location.longitude, location.latitude]
          : COLOMBIA_CENTER,
        zoom: location ? 15 : 5,
      };

  const onSave = async () => {
    const center = mapViewport.center;
    if (!center) return;

    try {
      await setLocationMutation.mutateAsync({
        barbershopId: barbershop._id,
        longitude: center[0],
        latitude: center[1],
      });
      haptic.trigger("success");
      toast.success("Ubicación guardada correctamente");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo guardar la ubicación. Intenta de nuevo.");
    }
  };

  const onRemove = async () => {
    try {
      await removeLocationMutation.mutateAsync({
        barbershopId: barbershop._id,
      });
      haptic.trigger("success");
      toast.success("Ubicación eliminada");
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo eliminar la ubicación. Intenta de nuevo.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative h-64 w-full overflow-hidden rounded-xl border">
        <MapCanvas onViewportChange={setViewport} viewport={mapViewport}>
          <MapControls showLocate />
        </MapCanvas>

        {/* Center pin: the owner moves the map so the tip sits on the shop. */}
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <MapPinIcon
            className="size-9 -translate-y-1/2 text-primary drop-shadow-md"
            weight="fill"
          />
        </div>
      </div>

      <p className="text-muted-foreground text-sm">
        Mueve el mapa para centrar el pin sobre tu barbería, o usa el botón de
        ubicación para empezar desde dónde estás.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button disabled={setLocationMutation.isPending} onClick={onSave}>
          {setLocationMutation.isPending ? <Spinner /> : "Guardar ubicación"}
        </Button>

        {location && (
          <Button
            disabled={removeLocationMutation.isPending}
            onClick={onRemove}
            variant="outline"
          >
            {removeLocationMutation.isPending ? (
              <Spinner />
            ) : (
              "Quitar ubicación"
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
