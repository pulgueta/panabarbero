import type { Barbershop } from "@panabarbero/convex/schemas";
import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import type { FC } from "react";

import { BarbershopRating } from "@/components/barbershops/rating";
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
}

export const BarbershopListCard: FC<BarbershopListCardProps> = ({
  barbershop,
}) => {
  return (
    <Card
      className="shadow-sm transition-shadow hover:shadow-md"
      key={barbershop._id}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex w-full items-start justify-between">
            <div className="flex items-start gap-2.5">
              <Scissors className="mt-1.5 size-5 text-muted-foreground" />
              <div>
                <CardTitle
                  className="text-balance font-bold text-xl tracking-tight"
                  style={{
                    viewTransitionName: `barbershop-${barbershop.uuid}`,
                  }}
                >
                  {barbershop.name}
                </CardTitle>
                <p className="text-muted-foreground text-xs">
                  {barbershop.city}, {barbershop.state}
                </p>
              </div>
            </div>
            <img
              loading="lazy"
              alt={`Banner de ${barbershop?.name}`}
              src={barbershop?.bannerUrl ?? "/default-logo.png"}
              className="size-8 rounded-full object-cover md:size-12"
            />
          </div>
        </div>
        <CardDescription>{barbershop.address.fullAddress}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {barbershop.services?.length} servicios
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button asChild>
          <Link
            to="/barbershops/$barbershopUuid"
            params={{
              barbershopUuid: barbershop.uuid,
            }}
            preload="intent"
            viewTransition
          >
            Ver servicios
          </Link>
        </Button>

        <BarbershopRating value={barbershop.metadata?.rating ?? 0} readOnly />
      </CardFooter>
    </Card>
  );
};
