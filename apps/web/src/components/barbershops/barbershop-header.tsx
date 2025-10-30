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
  DrawerDescription,
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
  const reviews = barbershop?.metadata?.reviews;

  const socialMediaLabelMap = {
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    twitter: "X",
    youtube: "YouTube",
    website: "Sitio web",
    email: "Correo electrónico",
    whatsapp: "WhatsApp",
    phone: "Teléfono",
  };

  return (
    <section className="space-y-1">
      <h1
        className="text-balance font-bold text-2xl tracking-tight"
        style={{ viewTransitionName: `barbershop-${barbershop?.uuid}` }}
      >
        {barbershop?.name}
      </h1>
      <p
        className="mb-1 text-muted-foreground text-sm"
        style={{
          viewTransitionName: `barbershop-${barbershop?.uuid}-city-state`,
        }}
      >
        {barbershop?.city}, {barbershop?.state}.
      </p>
      <p
        className="mb-1 text-muted-foreground text-sm"
        style={{
          viewTransitionName: `barbershop-${barbershop?.uuid}-address`,
        }}
      >
        {barbershop?.address.fullAddress}
        {barbershop?.address.details && (
          <>
            <br />
            {`(${barbershop?.address.details})`}
          </>
        )}
      </p>
      {barbershop?.contactPhone && (
        <p className="mb-1 text-muted-foreground text-sm">
          Teléfono:{" "}
          <a
            href={`tel:+57${barbershop?.contactPhone}`}
            className="underline-offset-4 hover:underline"
          >
            {barbershop?.contactPhone}
          </a>
        </p>
      )}
      {barbershop?.metadata?.contactEmail && (
        <p className="mb-2.5 text-muted-foreground text-sm">
          Correo de contacto:{" "}
          <a
            href={`mailto:${barbershop?.metadata?.contactEmail}`}
            className="underline-offset-4 hover:underline"
          >
            {barbershop?.metadata?.contactEmail}
          </a>
        </p>
      )}

      <div className="flex flex-col">
        <BarbershopRating
          value={barbershop?.metadata?.rating ?? 0}
          readOnly
          style={{
            viewTransitionName: `barbershop-${barbershop?.uuid}-rating`,
          }}
        />

        <p className="mt-px inline-flex items-center gap-1 text-muted-foreground text-xs md:text-sm">
          {reviews ?? "Sin"}{" "}
          {reviews && reviews > 1 ? `calificaciones` : `calificación`}.
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
                    <DrawerDescription>
                      {requiredReviewMessage}
                    </DrawerDescription>
                  </DrawerHeader>
                )}
                <DrawerFooter>
                  {userId ? (
                    canReview && (
                      <ReviewForm
                        barbershopId={barbershop?._id!}
                        userId={userId}
                      />
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

      <p className="mb-2.5 text-pretty font-medium text-sm">
        {barbershop?.description ?? "No hay descripción disponible."}
      </p>

      <p className="mb-2 text-pretty text-sm">Links o redes sociales:</p>
      {barbershop?.metadata?.socialMedia?.length! > 0 ? (
        <ul className="list-disc text-pretty pl-4 text-sm">
          {barbershop?.metadata?.socialMedia?.map((socialMedia) => (
            <li key={socialMedia.platform}>
              <a
                href={socialMedia.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground text-xs underline-offset-4 hover:underline"
              >
                {socialMediaLabelMap[socialMedia.platform]}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-pretty text-muted-foreground text-sm">
          No hay links o redes sociales disponibles.
        </p>
      )}
    </section>
  );
};
