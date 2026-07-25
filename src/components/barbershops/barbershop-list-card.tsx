import type { Barbershop } from "@convex/schema";
import { StarIcon, StorefrontIcon } from "@phosphor-icons/react";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StarRating } from "@/components/ui/star-rating";
import { useIsCurrentlyOpen } from "@/hooks/barbershop/use-is-currently-open";
import { getLogoUrl } from "@/hooks/use-upload";

/** Listing row shape: `barbershops.getActive` decorates each doc with ratings. */
export type BarbershopListItem = Barbershop & {
  averageRating?: number;
  reviewCount?: number;
};

interface BarbershopListCardProps {
  barbershop: BarbershopListItem;
}

/** Grid-view card: media strip with open/rating badges, identity, and CTA. */
export const BarbershopListCard: FC<BarbershopListCardProps> = ({
  barbershop,
}) => {
  const isOpen = useIsCurrentlyOpen(barbershop.availability);
  const logoUrl = getLogoUrl(barbershop.logoKey);
  const rating = barbershop.averageRating ?? 0;
  const reviewCount = barbershop.reviewCount ?? 0;

  return (
    <Card
      className="gap-0 py-0 transition-shadow hover:shadow-xs"
      style={{
        viewTransitionName: `barbershop-list-card-${barbershop.uuid}`,
      }}
    >
      <div className="relative flex h-32 items-center justify-center border-b bg-muted/40">
        {logoUrl ? (
          <img
            alt={`Logo de ${barbershop.name}`}
            className="size-full object-cover"
            loading="lazy"
            src={logoUrl}
            style={{ viewTransitionName: `barbershop-logo-${barbershop.uuid}` }}
          />
        ) : (
          <StorefrontIcon className="size-7 text-muted-foreground/50" />
        )}

        {isOpen !== null && (
          <Badge
            className="absolute top-2.5 left-2.5"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-status`,
            }}
            variant={isOpen ? "secondary" : "warning"}
          >
            {isOpen ? "Abierto" : "Cerrado"}
          </Badge>
        )}

        {reviewCount > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-full border bg-background px-2.5 py-0.5 font-semibold text-xs tabular-nums">
            <StarIcon className="size-3 text-amber-500" weight="fill" />
            {rating.toFixed(1)}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1 px-4 pt-3.5">
        <h3
          className="truncate font-bold leading-tight tracking-tight"
          style={{ viewTransitionName: `barbershop-${barbershop.uuid}` }}
        >
          {barbershop.name}
        </h3>

        <p
          className="truncate text-muted-foreground text-xs"
          style={{
            viewTransitionName: `barbershop-${barbershop.uuid}-address`,
          }}
        >
          {barbershop.address.fullAddress} · {barbershop.city}
        </p>

        <div
          className="mt-0.5 flex items-center gap-1.5"
          style={{
            viewTransitionName: `barbershop-${barbershop.uuid}-rating`,
          }}
        >
          <StarRating readOnly starClassName="size-3.5" value={rating} />
          <span className="text-muted-foreground text-xs tabular-nums">
            {reviewCount > 0
              ? `${reviewCount} ${reviewCount === 1 ? "reseña" : "reseñas"}`
              : "Sin reseñas"}
          </span>
        </div>
      </div>

      <div className="mt-auto px-4 pt-3 pb-4">
        <Button
          className="w-full"
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
          variant="outline"
        >
          Ver servicios
        </Button>
      </div>
    </Card>
  );
};
