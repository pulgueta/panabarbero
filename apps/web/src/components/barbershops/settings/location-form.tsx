import type { Barbershop } from "@convex/schema";
import { CrosshairIcon, MapPinIcon } from "@phosphor-icons/react";
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
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import {
  useBarbershopLocation,
  useBarbershopLocationActions,
} from "@/hooks/barbershop/use-barbershop-metadata";
import { useGeolocation } from "@/hooks/use-geolocation";

/** Approximate geographic center of Colombia, used until a location is set. */
const COLOMBIA_CENTER: [number, number] = [-74.2973, 4.5709];
const COLOMBIA_ZOOM = 5;

interface LocationFormProps {
  barbershop: Barbershop;
}

export const LocationForm: FC<LocationFormProps> = ({ barbershop }) => {
  const { data: location } = useBarbershopLocation(barbershop._id);
  const { setLocationMutation, removeLocationMutation } =
    useBarbershopLocationActions();
  const haptic = useWebHaptics();

  const { request, status } = useGeolocation();

  const [isEditing, setIsEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [viewport, setViewport] = useState<Partial<MapViewport>>({});

  const mapViewport: Partial<MapViewport> = viewport.center
    ? viewport
    : {
        center: location
          ? [location.longitude, location.latitude]
          : COLOMBIA_CENTER,
        zoom: location ? 15 : COLOMBIA_ZOOM,
      };

  const canUseGeo = status !== "unsupported";

  const onUseMyLocation = async () => {
    const coords = await request();
    if (!coords) {
      if (status === "denied") {
        toast.error("Permite el acceso a tu ubicación para usar esta función.");
      } else if (status !== "unsupported") {
        toast.error("No se pudo obtener tu ubicación. Intenta de nuevo.");
      }
      return;
    }
    setViewport({ center: [coords.lng, coords.lat], zoom: 18 });
  };

  const onSave = async () => {
    const center = mapViewport.center;
    if (!center) return;

    // Nothing to persist if the pin still sits on the saved location.
    if (
      location &&
      center[0] === location.longitude &&
      center[1] === location.latitude
    ) {
      toast.info("La ubicación no ha cambiado.");
      setIsEditing(false);
      return;
    }

    try {
      await setLocationMutation.mutateAsync({
        barbershopId: barbershop._id,
        longitude: center[0],
        latitude: center[1],
      });
      haptic.trigger("success");
      toast.success("Ubicación guardada correctamente");
      setIsEditing(false);
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
      setConfirmOpen(false);
      setIsEditing(false);
      setViewport({});
    } catch {
      haptic.trigger("error");
      toast.error("No se pudo eliminar la ubicación. Intenta de nuevo.");
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col gap-3">
      <div className="relative h-60 w-full overflow-hidden rounded-xl border">
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

        {/* Interaction blocker while the map is locked. */}
        {!isEditing && (
          <div className="absolute inset-0 z-20 cursor-not-allowed" />
        )}
      </div>

      {isEditing && (
        <p className="text-muted-foreground text-sm">
          Mueve el mapa para centrar el pin sobre tu barbería, o usa tu
          ubicación actual para empezar desde donde estás.
        </p>
      )}

      <div className="mt-auto">
        {isEditing ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              disabled={setLocationMutation.isPending}
              onClick={onSave}
            >
              {setLocationMutation.isPending ? (
                <Spinner />
              ) : (
                "Guardar ubicación"
              )}
            </Button>

            {(canUseGeo || location) && (
              <div className="flex flex-col gap-2 min-[380px]:flex-row">
                {canUseGeo && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={status === "prompting"}
                    onClick={onUseMyLocation}
                  >
                    {status === "prompting" ? (
                      <Spinner />
                    ) : (
                      <CrosshairIcon weight="bold" />
                    )}
                    Usar mi ubicación
                  </Button>
                )}

                {location && (
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={removeLocationMutation.isPending}
                    onClick={() => setConfirmOpen(true)}
                  >
                    Quitar ubicación
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setIsEditing(true)}>
              Activar mapa
            </Button>

            {location && (
              <Button
                variant="outline"
                className="flex-1"
                disabled={removeLocationMutation.isPending}
                onClick={() => setConfirmOpen(true)}
              >
                Quitar ubicación
              </Button>
            )}
          </div>
        )}
      </div>

      <ResponsiveModal open={confirmOpen} onOpenChange={setConfirmOpen}>
        <ResponsiveModalContent>
          <ResponsiveModalHeader>
            <ResponsiveModalTitle>¿Quitar ubicación?</ResponsiveModalTitle>
            <ResponsiveModalDescription>
              Se eliminará la ubicación guardada de tu barbería. Tendrás que
              volver a configurarla para que los clientes puedan encontrarte.
            </ResponsiveModalDescription>
          </ResponsiveModalHeader>
          <ResponsiveModalFooter>
            <Button
              variant="destructive"
              disabled={removeLocationMutation.isPending}
              onClick={onRemove}
            >
              {removeLocationMutation.isPending ? <Spinner /> : "Sí, quitar"}
            </Button>
          </ResponsiveModalFooter>
        </ResponsiveModalContent>
      </ResponsiveModal>
    </div>
  );
};
