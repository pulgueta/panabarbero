/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import type { Barbershop } from "@convex/schema";
import { PhoneIcon } from "@phosphor-icons/react";
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
import { getLogoUrl } from "@/hooks/use-upload";
import { cn } from "@/lib/utils";

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
  /** R2 logo key from barbershopMetadata — used to construct the CDN URL */
  logoKey?: string | null;
};

export const BarbershopHeader: FC<BarbershopHeaderProps> = (props) => {
  const { barbershop, availability, logoKey } = props;

  const { AvailabilityLabel } = useSchedule(availability);

  const logoUrl = getLogoUrl(logoKey);

  return (
    <section className="flex w-full flex-col justify-between gap-4 md:flex-row">
      <div className="flex w-full flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left">
        <div
          className={cn(
            "relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40",
            "size-32",
          )}
          style={{ viewTransitionName: `barbershop-logo-${barbershop?.uuid}` }}
        >
          <img
            src={logoUrl ?? "/default-logo.png"}
            alt={`Logo de ${barbershop?.name}`}
            className="size-full object-cover"
            loading="lazy"
          />
        </div>

        <div className="w-full space-y-1">
          <h1
            className="text-balance font-semibold text-3xl tracking-tight"
            style={{ viewTransitionName: `barbershop-${barbershop?.uuid}` }}
          >
            {barbershop?.name}
          </h1>

          {barbershop?.description && (
            <p className="text-pretty text-sm md:text-base">
              {barbershop.description}
            </p>
          )}

          <div className="mt-1 flex items-center justify-center gap-2 md:justify-start">
            <AvailabilityLabel />
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-max gap-1 text-sm md:w-full md:max-w-3xs">
        <div className="flex items-start gap-2 text-muted-foreground md:justify-end">
          <div
            className="flex w-full flex-col items-center gap-2 md:items-end"
            style={{
              viewTransitionName: `barbershop-${barbershop?.uuid}-address`,
            }}
          >
            <p
              className="font-medium text-foreground md:text-end"
              style={{
                viewTransitionName: `barbershop-${barbershop?.uuid}-city-state`,
              }}
            >
              {barbershop?.city}, {barbershop?.state}
            </p>
            <p className="block text-xs md:text-end md:text-sm">
              {barbershop?.address.fullAddress}
              {barbershop?.address.details && (
                <>, {barbershop.address.details}</>
              )}
            </p>

            <Popover>
              <PopoverTrigger
                render={
                  <Button variant="outline" className="w-full md:w-max" />
                }
              >
                Ver horario de atención
              </PopoverTrigger>
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
                              {dayInfo.es}{" "}
                              {hasLunch && (
                                <span className="text-destructive text-xs">
                                  *
                                </span>
                              )}
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

                  {availability?.some(
                    (day) => day.lunchStart && day.lunchEnd,
                  ) && (
                    <p className="text-muted-foreground text-xs italic">
                      (*): No disponible durante:{" "}
                      {availability
                        .flatMap((day) =>
                          day.lunchStart && day.lunchEnd
                            ? [`${day.lunchStart} – ${day.lunchEnd}`]
                            : [],
                        )
                        .find(() => true)}
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {barbershop?.contactPhone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <PhoneIcon className="size-4 shrink-0" weight="duotone" />
            <a
              href={`tel:${barbershop.contactPhone}`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {barbershop.contactPhone}
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
