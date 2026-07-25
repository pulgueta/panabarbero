import type { Barbershop } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StarRating } from "@/components/ui/star-rating";
import { useIsCurrentlyOpen } from "@/hooks/barbershop/use-is-currently-open";
import { useBarbershopRating } from "@/hooks/use-reviews";
import { getLogoUrl } from "@/hooks/use-upload";

type BarbershopHeaderProps = {
  barbershop: Barbershop;
  /** R2 logo key from barbershopMetadata — used to construct the CDN URL */
  logoKey?: string | null;
};

export const BarbershopHeader: FC<BarbershopHeaderProps> = ({
  barbershop,
  logoKey,
}) => {
  const { data: rating } = useBarbershopRating(barbershop._id);

  const isOpen = useIsCurrentlyOpen(barbershop.availability);
  const logoUrl = getLogoUrl(logoKey);

  return (
    <section className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <div
          className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40 md:size-18"
          style={{ viewTransitionName: `barbershop-logo-${barbershop.uuid}` }}
        >
          <img
            alt={`Logo de ${barbershop.name}`}
            className="size-full object-contain p-1.5"
            loading="lazy"
            src={logoUrl ?? "/default-logo.png"}
          />
        </div>

        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h1
              className="text-balance font-semibold text-2xl tracking-tight md:text-3xl"
              style={{ viewTransitionName: `barbershop-${barbershop.uuid}` }}
            >
              {barbershop.name}
            </h1>

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
            className="text-pretty text-muted-foreground text-sm"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-address`,
            }}
          >
            {barbershop.address.fullAddress} · {barbershop.city},{" "}
            {barbershop.state}
          </p>

          <div
            className="flex items-center gap-2"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-rating`,
            }}
          >
            <StarRating
              readOnly
              starClassName="size-4"
              value={rating.average}
            />
            {rating.count > 0 ? (
              <p className="text-sm tabular-nums">
                <span className="font-semibold">
                  {rating.average.toFixed(1)}
                </span>{" "}
                <span className="text-muted-foreground">
                  {rating.count} {rating.count === 1 ? "reseña" : "reseñas"}
                </span>
              </p>
            ) : (
              <p className="text-muted-foreground text-sm">Sin reseñas</p>
            )}
          </div>
        </div>
      </div>

      <Button
        className="w-full sm:w-auto"
        nativeButton={false}
        render={
          <Link
            params={{ barbershopUuid: barbershop.uuid }}
            to="/barbershops/$barbershopUuid/book"
          />
        }
      >
        Reservar cita
      </Button>
    </section>
  );
};
