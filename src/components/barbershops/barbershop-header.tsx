/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import type { Barbershop } from "@convex/schema";
import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useSchedule } from "@/hooks/barbershop/use-schedule";

const DAY_NAMES: Record<string, { es: string; short: string }> = {
  monday: { es: "Lunes", short: "Lun" },
  tuesday: { es: "Martes", short: "Mar" },
  wednesday: { es: "Miércoles", short: "Mié" },
  thursday: { es: "Jueves", short: "Jue" },
  friday: { es: "Viernes", short: "Vie" },
  saturday: { es: "Sábado", short: "Sáb" },
  sunday: { es: "Domingo", short: "Dom" },
};

type BarbershopHeaderProps = {
  barbershop: Barbershop | null;
  userId: string | undefined;
  availability: Barbershop["availability"] | null;
};

export const BarbershopHeader: FC<BarbershopHeaderProps> = (props) => {
  const { barbershop, availability } = props;

  // const { isMobile } = useIsMobile();
  const { AvailabilityLabel } = useSchedule(availability);

  // const canReview = useCanReview({
  //   barbershopId: barbershop?._id!,
  //   userId: userId!,
  // });

  // const formHeadLabel = "¡Tu opinión ayuda a mejorar el trabajo de todos!";
  // const requiredReviewMessage =
  //   "Necesitas haber asistido a la barbería mediante una cita para poder calificar.";
  // const reviews = barbershop?.metadata?.reviews;

  // const socialMediaLabelMap = {
  //   instagram: "Instagram",
  //   facebook: "Facebook",
  //   tiktok: "TikTok",
  //   twitter: "X",
  //   youtube: "YouTube",
  //   website: "Sitio web",
  //   email: "Correo electrónico",
  //   whatsapp: "WhatsApp",
  //   phone: "Teléfono",
  // };

  return (
    <section className="space-y-1">
      <h1
        className="text-balance font-bold text-2xl tracking-tight"
        style={{ viewTransitionName: `barbershop-${barbershop?.uuid}` }}
      >
        {barbershop?.name}
      </h1>
      {barbershop?.description && (
        <p className="mb-1 text-pretty font-medium text-sm">
          {barbershop?.description}
        </p>
      )}
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
        {barbershop?.address.fullAddress}.
        {barbershop?.address.details && (
          <>
            <br />
            {barbershop?.address.details}
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

      <div className="mb-1 flex flex-col items-start gap-2">
        <AvailabilityLabel />

        <Popover>
          <PopoverTrigger
            render={<Button variant="outline">Ver horario</Button>}
          />
          <PopoverContent className="w-full">
            <div className="space-y-2">
              <h4 className="font-semibold">Horario de atención</h4>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-sm">Día</TableHead>
                    <TableHead className="text-sm">Horario</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {availability?.map((day) => {
                    const dayInfo = DAY_NAMES[day.weekDay.day];
                    const hasLunch = day.lunchStart && day.lunchEnd;

                    return (
                      <TableRow key={day.weekDay.day}>
                        <TableCell className="py-2 text-xs">
                          {dayInfo.es} {hasLunch && <span>*</span>}
                        </TableCell>
                        <TableCell className="py-2 text-xs tabular-nums">
                          {day.weekDay.isActive
                            ? `${day.openAt} - ${day.closeAt}`
                            : "Cerrado"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {availability?.some((day) => day.lunchStart && day.lunchEnd) && (
                <p className="text-muted-foreground text-xs italic">
                  *: No disponible durante:{" "}
                  {availability
                    .filter((day) => day.lunchStart && day.lunchEnd)
                    .map((day) => `${day.lunchStart} - ${day.lunchEnd}`)
                    .find(() => true)}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* <div className="flex flex-col">
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
      </div> */}

      {/* <p className="mb-2 text-pretty text-sm">Links o redes sociales:</p>
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
      )} */}
    </section>
  );
};
