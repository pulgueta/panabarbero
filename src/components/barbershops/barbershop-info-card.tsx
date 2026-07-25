import type { Barbershop, BarbershopMetadata } from "@convex/schema";
import {
  ArrowUpRightIcon,
  CaretDownIcon,
  FacebookLogoIcon,
  GlobeIcon,
  InstagramLogoIcon,
  MapPinIcon,
  MapTrifoldIcon,
  NavigationArrowIcon,
  PhoneIcon,
  TiktokLogoIcon,
  XLogoIcon,
  YoutubeLogoIcon,
} from "@phosphor-icons/react";
import type { FC, ReactNode } from "react";

import { Apple } from "@/components/icons/apple-icon";
import { GoogleMaps } from "@/components/icons/google-icon";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { MapViewport } from "@/components/ui/map";
import {
  Map as MapCanvas,
  MapMarker,
  MarkerContent,
  MarkerLabel,
} from "@/components/ui/map";
import { useBarbershopMetadata } from "@/hooks/barbershop/use-barbershop-metadata";

const DAY_NAMES: Record<string, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miércoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sábado",
  sunday: "Domingo",
};

type SocialPlatform = NonNullable<
  BarbershopMetadata["socialMedia"]
>[number]["platform"];

const SOCIAL_PLATFORMS: Record<
  SocialPlatform,
  { label: string; icon: ReactNode }
> = {
  instagram: { label: "Instagram", icon: <InstagramLogoIcon /> },
  facebook: { label: "Facebook", icon: <FacebookLogoIcon /> },
  tiktok: { label: "TikTok", icon: <TiktokLogoIcon /> },
  twitter: { label: "X", icon: <XLogoIcon /> },
  youtube: { label: "YouTube", icon: <YoutubeLogoIcon /> },
};

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

interface BarbershopInfoCardProps {
  barbershop: Barbershop;
}

/**
 * Detail-page sidebar: mini map with directions, address, phone, weekly
 * schedule, and social links (from the public barbershop metadata).
 */
export const BarbershopInfoCard: FC<BarbershopInfoCardProps> = ({
  barbershop,
}) => {
  const { data: metadata } = useBarbershopMetadata(barbershop._id);

  const latitude = metadata?.location?.latitude;
  const longitude = metadata?.location?.longitude;
  const hasCoords = latitude !== undefined && longitude !== undefined;

  const mapViewport: Partial<MapViewport> | undefined = hasCoords
    ? { center: [longitude, latitude], zoom: 14 }
    : undefined;

  const socialLinks = [
    ...(metadata?.socialMedia?.map((social) => ({
      ...SOCIAL_PLATFORMS[social.platform],
      href: social.url,
    })) ?? []),
    ...(metadata?.websiteUrl
      ? [{ label: "Sitio web", icon: <GlobeIcon />, href: metadata.websiteUrl }]
      : []),
  ];

  return (
    <Card className="gap-0 py-0">
      <h2 className="px-4 pt-4 pb-3 font-semibold tracking-tight">
        Información
      </h2>

      {hasCoords && (
        <div className="space-y-3 px-4 pb-3">
          <div className="relative h-36 overflow-hidden rounded-lg border">
            <MapCanvas viewport={mapViewport}>
              <MapMarker latitude={latitude} longitude={longitude}>
                <MarkerContent className="-translate-y-1/2">
                  <img
                    alt="Ubicación de la barbería"
                    className="size-12"
                    src="/barbershop-map-location.svg"
                  />
                </MarkerContent>
                <MarkerLabel>{barbershop.name}</MarkerLabel>
              </MapMarker>
            </MapCanvas>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button className="w-full" size="sm" variant="outline">
                  <NavigationArrowIcon weight="fill" />
                  Abrir ruta
                  <CaretDownIcon data-icon="inline-end" />
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-48">
              {getMapLinks(latitude, longitude, barbershop.name).map((link) => (
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
      )}

      <div className="space-y-3 px-4 pb-4">
        <div className="flex items-start gap-2.5">
          <MapPinIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">Dirección</p>
            <p className="text-sm">
              {barbershop.address.fullAddress}
              {barbershop.address.details && (
                <>, {barbershop.address.details}</>
              )}
            </p>
          </div>
        </div>

        {barbershop.contactPhone && (
          <div className="flex items-start gap-2.5">
            <PhoneIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Teléfono</p>
              <a
                className="text-sm tabular-nums underline-offset-4 hover:underline"
                href={`tel:${barbershop.contactPhone}`}
              >
                {barbershop.contactPhone}
              </a>
            </div>
          </div>
        )}
      </div>

      {barbershop.availability.length > 0 && (
        <div className="space-y-2 border-t px-4 py-3.5">
          <p className="font-medium text-sm">Horario</p>

          <div className="space-y-1.5">
            {barbershop.availability.map((day) => {
              // Each day carries its own lunch window, so render it on that
              // day's row — a single shared footnote would show one shop-wide
              // break even when the days differ.
              const hasLunch =
                day.weekDay.isActive && day.lunchStart && day.lunchEnd;

              return (
                <div className="text-sm" key={day.weekDay.day}>
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">
                      {DAY_NAMES[day.weekDay.day]}
                    </span>
                    <span className="tabular-nums">
                      {day.weekDay.isActive
                        ? `${day.openAt} - ${day.closeAt}`
                        : "Cerrado"}
                    </span>
                  </div>

                  {hasLunch && (
                    <p className="text-right text-muted-foreground text-xs tabular-nums">
                      Descanso {day.lunchStart} - {day.lunchEnd}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-2 border-t px-4 py-3.5">
        <p className="font-medium text-sm">Redes sociales</p>

        {socialLinks.length > 0 ? (
          <div className="space-y-2">
            {socialLinks.map((link) => (
              <a
                className="flex items-center gap-2 text-sm underline-offset-4 hover:underline [&>svg]:size-4 [&>svg]:text-muted-foreground"
                href={link.href}
                key={link.label}
                rel="noreferrer noopener"
                target="_blank"
              >
                {link.icon}
                {link.label}
                <ArrowUpRightIcon className="size-3! text-muted-foreground" />
              </a>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            Esta barbería aún no ha conectado sus redes.
          </p>
        )}
      </div>
    </Card>
  );
};
