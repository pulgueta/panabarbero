import type { Barbershop } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import type { FC } from "react";

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

export const BarbershopListCard: FC<BarbershopListCardProps> = ({
  barbershop,
  showAddress = true,
}) => {
  return (
    <Card className="gap-4 transition-shadow hover:shadow-xs">
      <CardHeader className="border-b [.border-b]:pb-4">
        <div className="flex items-start justify-between">
          <div className="flex w-full items-start justify-between">
            <div className="flex items-start gap-2.5">
              <div>
                <CardTitle
                  className="text-balance font-bold text-xl tracking-tight"
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
        <Button asChild>
          <Link
            to="/barbershops/$barbershopUuid"
            params={{
              barbershopUuid: barbershop.uuid,
            }}
            preload="intent"
            style={{
              viewTransitionName: `barbershop-${barbershop.uuid}-link`,
            }}
          >
            {showAddress ? "Ver servicios" : "Ver barbería"}
          </Link>
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
