import type { Barbershop } from "@convex/schema";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

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

interface BarbershopListCardProps {
  barbershop: Barbershop;
  showAddress?: boolean;
}

const isCurrentlyOpen = (barbershop: Barbershop): boolean => {
  const now = new Date();
  const currentDay = now.getDay();
  const dayMap = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const currentDayName = dayMap[currentDay];

  const todaySchedule = barbershop.availability.find(
    (day) => day.weekDay.day === currentDayName && day.weekDay.isActive,
  );

  if (!todaySchedule) return false;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMin] = todaySchedule.openAt.split(":").map(Number);
  const [closeHour, closeMin] = todaySchedule.closeAt.split(":").map(Number);

  const openMinutes = openHour * 60 + openMin;
  const closeMinutes = closeHour * 60 + closeMin;

  // Check if currently during lunch break
  if (todaySchedule.lunchStart && todaySchedule.lunchEnd) {
    const [lunchStartHour, lunchStartMin] = todaySchedule.lunchStart
      .split(":")
      .map(Number);
    const [lunchEndHour, lunchEndMin] = todaySchedule.lunchEnd
      .split(":")
      .map(Number);
    const lunchStartMinutes = lunchStartHour * 60 + lunchStartMin;
    const lunchEndMinutes = lunchEndHour * 60 + lunchEndMin;

    if (
      currentMinutes >= lunchStartMinutes &&
      currentMinutes < lunchEndMinutes
    ) {
      return false;
    }
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
};

export const BarbershopListCard: FC<BarbershopListCardProps> = ({
  barbershop,
  showAddress = true,
}) => {
  const isOpen = isCurrentlyOpen(barbershop);
  return (
    <Card
      className="gap-4 transition-shadow hover:shadow-xs"
      style={{
        viewTransitionName: `barbershop-list-card-${barbershop.uuid}`,
      }}
    >
      <CardHeader className="border-b [.border-b]:pb-4">
        <div className="flex items-start justify-between">
          <div className="flex w-full items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <CardTitle
                    className="text-balance font-bold text-xl tracking-tight"
                    style={{
                      viewTransitionName: `barbershop-${barbershop.uuid}`,
                    }}
                  >
                    {barbershop.name}
                  </CardTitle>
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
                <p
                  className="text-muted-foreground text-xs"
                  style={{
                    viewTransitionName: `barbershop-${barbershop.uuid}-city-state`,
                  }}
                >
                  {barbershop.city}, {barbershop.state}
                </p>
              </div>
            </div>

            {/* <BarbershopAvatar barbershop={barbershop} /> */}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showAddress && (
          <>
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
          </>
        )}
      </CardContent>
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
