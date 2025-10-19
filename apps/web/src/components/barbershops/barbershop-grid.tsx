import { Link } from "@tanstack/react-router";
import { Scissors } from "lucide-react";
import type { FC } from "react";
import { LazyLoadImage } from "react-lazy-load-image-component";

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
import { Spinner } from "@/components/ui/spinner";
import { useActiveBarbershops } from "@/hooks/use-barbershop";
import type { BarbershopSearch } from "@/routes/barbershops";

interface BarbershopGridProps extends BarbershopSearch {}

export const BarbershopGrid: FC<BarbershopGridProps> = ({ city, state }) => {
  const {
    data: barbershops,
    isFetching,
    isLoading,
  } = useActiveBarbershops({ city, state });

  if (isLoading || isFetching) {
    return (
      <div>
        <Spinner />
        Cargando barberías...
      </div>
    );
  }

  return (
    <main className="grid grid-cols-1 gap-x-6 gap-y-8 px-4 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
      {barbershops.map((barbershop) => (
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
                <LazyLoadImage
                  effect="blur"
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

            <BarbershopRating
              value={barbershop.metadata?.rating ?? 0}
              readOnly
            />
          </CardFooter>
        </Card>
      ))}
    </main>
  );
};
