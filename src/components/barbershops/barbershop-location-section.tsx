import type { Barbershop } from "@convex/schema";
import {
  CaretDownIcon,
  MapTrifoldIcon,
  NavigationArrowIcon,
} from "@phosphor-icons/react";

import { Apple } from "@/components/icons/apple-icon";
import { GoogleMaps } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MapViewport } from "@/components/ui/map";
import {
  Map as MapCanvas,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
} from "@/components/ui/map";
import { Separator } from "@/components/ui/separator";
import { useBarbershopLocation } from "@/hooks/barbershop/use-barbershop-metadata";

function getMapLinks(latitude: number, longitude: number, label: string) {
  const destination = `${latitude},${longitude}`;
  const encodedLabel = encodeURIComponent(label);

  return [
    {
      label: "Google Maps",
      href: `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`,
      icon: <GoogleMaps className="size-4 shrink-0" />,
    },
    {
      label: "Apple Maps",
      href: `https://maps.apple.com/?daddr=${destination}&q=${encodedLabel}&dirflg=d`,
      icon: <Apple className="size-4 shrink-0" />,
    },
    {
      label: "Waze",
      href: `https://waze.com/ul?ll=${destination}&navigate=yes`,
      icon: <MapTrifoldIcon />,
    },
  ];
}

interface BarbershopLocationSectionProps {
  barbershopId: Barbershop["_id"];
  barbershopName: string;
}

export function BarbershopLocationSection({
  barbershopId,
  barbershopName,
}: BarbershopLocationSectionProps) {
  const { data: location } = useBarbershopLocation(barbershopId);

  const lat = location?.latitude;
  const lng = location?.longitude;

  if (lat === undefined || lng === undefined) return null;

  const mapLinks = getMapLinks(lat, lng, barbershopName);
  const mapViewport: Partial<MapViewport> = { center: [lng, lat], zoom: 14 };

  return (
    <>
      <Separator className="my-6" />

      <section className="space-y-4">
        <h2 className="text-balance font-semibold text-xl tracking-tight">
          Cómo llegar
        </h2>

        <div className="flex flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="outline">
                  <NavigationArrowIcon weight="fill" />
                  Abrir ruta
                  <CaretDownIcon data-icon="inline-end" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-48">
              {mapLinks.map((link) => (
                <DropdownMenuItem
                  key={link.label}
                  render={
                    <a
                      href={link.href}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {link.icon}
                      {link.label}
                    </a>
                  }
                />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="relative h-96 w-full overflow-hidden rounded-xl border">
          <MapCanvas viewport={mapViewport}>
            <MapMarker latitude={lat} longitude={lng}>
              <MarkerContent className="-translate-y-1/2">
                <img
                  alt="Ubicación de la barbería"
                  className="size-16"
                  src="/barbershop-map-location.svg"
                />
              </MarkerContent>
              <MarkerLabel>{barbershopName}</MarkerLabel>
            </MapMarker>

            <MapControls />
          </MapCanvas>
        </div>
      </section>
    </>
  );
}
