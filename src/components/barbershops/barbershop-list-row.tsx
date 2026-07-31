import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import type { BarbershopListItem } from "@/components/barbershops/barbershop-list-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { useIsCurrentlyOpen } from "@/hooks/barbershop/use-is-currently-open";
import { getLogoUrl } from "@/hooks/use-upload";

interface BarbershopListRowProps {
  barbershop: BarbershopListItem;
}

/** List-view row: compact identity + rating linking to the shop detail page. */
export const BarbershopListRow: FC<BarbershopListRowProps> = ({
  barbershop,
}) => {
  const isOpen = useIsCurrentlyOpen(barbershop.availability);
  const logoUrl = getLogoUrl(barbershop.logoKey);
  const rating = barbershop.averageRating ?? 0;
  const reviewCount = barbershop.reviewCount ?? 0;
  const servicesCount = barbershop.services?.length ?? 0;

  return (
    <Card
      className="flex-row items-center gap-3.5 px-4 transition-shadow hover:shadow-xs"
      style={{
        viewTransitionName: `barbershop-list-card-${barbershop.uuid}`,
      }}
    >
      <Avatar className="shrink-0" size="2xl">
        <AvatarImage
          alt={`Logo de ${barbershop.name}`}
          src={logoUrl ?? "/default-logo.png"}
        />
        <AvatarFallback>
          {barbershop.name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            className="truncate font-bold leading-tight tracking-tight"
            style={{ viewTransitionName: `barbershop-${barbershop.uuid}` }}
          >
            {barbershop.name}
          </h3>

          {isOpen !== null && (
            <Badge
              style={{
                viewTransitionName: `barbershop-${barbershop.uuid}-status`,
              }}
              variant={isOpen ? "secondary" : "warning"}
            >
              {isOpen ? "Abierto" : "Cerrado"}
            </Badge>
          )}
        </div>

        <p
          className="truncate text-muted-foreground text-xs"
          style={{
            viewTransitionName: `barbershop-${barbershop.uuid}-city-state`,
          }}
        >
          {barbershop.city}, {barbershop.state} · {servicesCount}{" "}
          {servicesCount === 1 ? "servicio" : "servicios"}
        </p>

        <div
          className="flex items-center gap-1.5"
          style={{
            viewTransitionName: `barbershop-${barbershop.uuid}-rating`,
          }}
        >
          <StarRating readOnly starClassName="size-3.5" value={rating} />
          {reviewCount > 0 ? (
            <span className="font-medium text-xs tabular-nums">
              {rating.toFixed(1)}{" "}
              <span className="font-normal text-muted-foreground">
                ({reviewCount})
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Sin reseñas</span>
          )}
        </div>
      </div>

      <Button
        nativeButton={false}
        render={
          <Link
            params={{ barbershopUuid: barbershop.uuid }}
            preload="intent"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-link`,
            }}
            to="/barbershops/$barbershopUuid"
          />
        }
        size="sm"
      >
        Ver barbería
      </Button>
    </Card>
  );
};
