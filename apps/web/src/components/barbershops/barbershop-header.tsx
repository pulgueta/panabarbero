/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import type { Barbershop } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

import { BarbershopRating } from "@/components/barbershops/rating";
import { ReviewForm } from "@/components/barbershops/reviews/review-form";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useCanReview } from "@/hooks/use-actions";
import { useIsMobile } from "@/hooks/use-is-mobile";

type BarbershopHeaderProps = {
  barbershop: Barbershop | null;
  userId: string | undefined;
};

export const BarbershopHeader: FC<BarbershopHeaderProps> = (props) => {
  const { barbershop, userId } = props;

  const { isMobile } = useIsMobile();

  const canReview = useCanReview({
    barbershopId: barbershop?._id!,
    userId: userId!,
  });

  const formHeadLabel = "¡Tu opinión ayuda a mejorar el trabajo de todos!";
  const requiredReviewMessage =
    "Necesitas haber asistido a la barbería mediante una cita para poder calificar.";

  return (
    <section className="space-y-1">
      <h1
        className="text-balance font-bold text-2xl tracking-tight"
        style={{ viewTransitionName: `barbershop-${barbershop?.uuid}` }}
      >
        {barbershop?.name}
      </h1>

      <div className="flex flex-col">
        <BarbershopRating value={barbershop?.metadata?.rating ?? 0} readOnly />

        <p className="mt-px inline-flex items-center gap-1 text-muted-foreground text-xs md:text-sm">
          {barbershop?.metadata?.reviews} calificaciones.
          {isMobile ? (
            <Drawer>
              <DrawerTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-muted-foreground text-xs md:text-sm"
                >
                  Calificar
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                {userId && (
                  <DrawerHeader>
                    <DrawerTitle>{formHeadLabel}</DrawerTitle>
                  </DrawerHeader>
                )}
                <DrawerFooter>
                  {userId ? (
                    canReview ? (
                      <ReviewForm
                        barbershopId={barbershop?._id!}
                        userId={userId}
                      />
                    ) : (
                      <p className="text-pretty text-center text-muted-foreground text-sm">
                        {requiredReviewMessage}
                      </p>
                    )
                  ) : (
                    <Button
                      asChild
                      variant="link"
                      size="sm"
                      className="pb-4 text-muted-foreground"
                    >
                      <Link to="/login">
                        Necesitas una cuenta para poder calificar.
                      </Link>
                    </Button>
                  )}
                </DrawerFooter>
              </DrawerContent>
            </Drawer>
          ) : (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="link"
                  size="sm"
                  className="px-0 text-muted-foreground text-xs md:text-sm"
                >
                  Calificar
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full max-w-sm">
                {userId ? (
                  canReview ? (
                    <ReviewForm
                      barbershopId={barbershop?._id!}
                      userId={userId}
                      formHeadLabel={formHeadLabel}
                    />
                  ) : (
                    <p className="text-pretty text-center text-muted-foreground text-sm">
                      {requiredReviewMessage}
                    </p>
                  )
                ) : (
                  <Button
                    asChild
                    variant="link"
                    size="sm"
                    className="text-muted-foreground"
                  >
                    <Link to="/login">
                      Necesitas una cuenta para poder calificar.
                    </Link>
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          )}
        </p>
      </div>

      {barbershop?.description && (
        <p className="text-pretty text-muted-foreground text-sm md:text-base">
          {barbershop.description ?? "No hay descripción disponible."}
        </p>
      )}
    </section>
  );
};
