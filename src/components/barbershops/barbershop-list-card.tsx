import type { Barbershop } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getLogoUrl } from "@/hooks/use-upload";
import { isCurrentlyOpen } from "@/lib/schedule-utils";

interface BarbershopListCardProps {
  barbershop: Barbershop;
  showAddress?: boolean;
}

export const BarbershopListCard: FC<BarbershopListCardProps> = ({
  barbershop,
  showAddress = true,
}) => {
  const isOpen = isCurrentlyOpen(barbershop.availability);

  const logoUrl = getLogoUrl(barbershop.logoKey);

  return (
    <Card
      className="gap-4 transition-shadow hover:shadow-xs"
      style={{
        viewTransitionName: `barbershop-list-card-${barbershop.uuid}`,
      }}
    >
      <CardHeader className="flex items-start justify-between gap-2">
        <div className="w-full max-w-72 space-y-1">
          <CardTitle
            className="line-clamp-2 truncate font-bold leading-5"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}`,
            }}
          >
            {barbershop.name}
          </CardTitle>

          <p
            className="text-muted-foreground text-xs"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-city-state`,
            }}
          >
            {barbershop.city}, {barbershop.state}
          </p>

          <Badge
            variant={isOpen ? "secondary" : "warning"}
            className="text-xs"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-status`,
            }}
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </Badge>
        </div>

        <Avatar size="xl" className="shrink-0">
          <AvatarImage src={logoUrl ?? "/default-logo.png"} />
          <AvatarFallback>
            {barbershop.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </CardHeader>
      {showAddress && (
        <CardContent>
          <CardDescription
            className="mb-2"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-address`,
            }}
          >
            Ubicación: {barbershop.address.fullAddress}
          </CardDescription>

          <div className="mb-4 flex items-center justify-between">
            <p
              className="text-muted-foreground text-sm"
              style={{
                viewTransitionName: `barbershop-${barbershop._id}-services`,
              }}
            >
              {barbershop.services?.length ? barbershop.services?.length : 0}{" "}
              {barbershop.services?.length === 1
                ? "servicio disponible."
                : "servicios disponibles."}
            </p>
          </div>
        </CardContent>
      )}
      <CardFooter className="justify-between">
        <Button
          nativeButton={false}
          render={
            <Link
              to="/barbershops/$barbershopUuid"
              params={{
                barbershopUuid: barbershop.uuid,
              }}
              preload="intent"
              style={{
                viewTransitionName: `barbershop-${barbershop.uuid}-link`,
              }}
            />
          }
        >
          {showAddress ? "Ver servicios" : "Ver barbería"}
        </Button>

        {/* <BarbershopRating
          value={barbershop.metadata?.rating ?? 0}
          readOnly
          style={{
            viewTransitionName: `barbershop-${barbershop.uuid}-rating`,
          }}
        /> */}
      </CardFooter>
    </Card>
  );
};
