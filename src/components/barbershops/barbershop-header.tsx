/** biome-ignore-all lint/style/noNonNullAssertion: objects are guaranteed to be not null */
import type { Barbershop } from "@convex/schema";
import { MapPinIcon, PhoneIcon } from "@phosphor-icons/react";
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
import { getLogoUrl } from "@/hooks/barbershop/use-barbershop-logo-actions";
import { useSchedule } from "@/hooks/barbershop/use-schedule";
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
    <section className="space-y-6">
      <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
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
            className="text-balance font-bold text-3xl tracking-tight"
            style={{ viewTransitionName: `barbershop-${barbershop?.uuid}` }}
          >
            {barbershop?.name}
          </h1>

          {barbershop?.description && (
            <p className="text-pretty text-sm sm:text-base">
              {barbershop.description}
            </p>
          )}

          <div className="mt-1 flex items-center justify-center gap-2 sm:justify-start">
            <AvailabilityLabel />
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-max gap-1 text-sm sm:grid-cols-2 md:w-full">
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPinIcon className="mt-0.5 size-4 shrink-0" weight="duotone" />

          <div
            className="min-w-0"
            style={{
              viewTransitionName: `barbershop-${barbershop?.uuid}-address`,
            }}
          >
            <span
              className="block font-medium text-foreground"
              style={{
                viewTransitionName: `barbershop-${barbershop?.uuid}-city-state`,
              }}
            >
              {barbershop?.city}, {barbershop?.state}
            </span>
            <span className="block text-xs">
              {barbershop?.address.fullAddress}
              {barbershop?.address.details && (
                <>, {barbershop.address.details}</>
              )}
            </span>
          </div>
        </div>

        {barbershop?.contactPhone && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <PhoneIcon className="size-4 shrink-0" weight="duotone" />
            <a
              href={`tel:+57${barbershop.contactPhone}`}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              {barbershop.contactPhone}
            </a>
          </div>
        )}
      </div>

      <Popover>
        <PopoverTrigger
          render={
            <Button variant="outline" className="w-full md:w-max">
              Ver horario de atención
            </Button>
          }
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
                        {dayInfo.es}{" "}
                        {hasLunch && (
                          <span className="text-destructive text-xs">*</span>
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

            {availability?.some((day) => day.lunchStart && day.lunchEnd) && (
              <p className="text-muted-foreground text-xs italic">
                (*): No disponible durante:{" "}
                {availability
                  .filter((day) => day.lunchStart && day.lunchEnd)
                  .map((day) => `${day.lunchStart} – ${day.lunchEnd}`)
                  .find(() => true)}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </section>
  );
};
