import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Search, Store } from "lucide-react";

import { Rating, RatingButton } from "@/components/barbershops/rating";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/barbershops/")({
  component: BarbershopsPage,
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.barbershops.getActiveBarbershops, {}),
    );
  },
  pendingComponent: () => <div>Loading...</div>,
});

function BarbershopsPage() {
  const { data: barbershops } = useSuspenseQuery(
    convexQuery(api.barbershops.getActiveBarbershops, {}),
  );

  return (
    <div className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
      <header className="mb-8 flex flex-col items-center justify-between gap-4 border-b py-8">
        <section className="px-4">
          <h1 className="text-balance text-center font-bold text-3xl tracking-tight">
            ¿Qué estilo buscas hoy?
          </h1>
        </section>

        <div className="relative mx-auto w-full max-w-xl px-4">
          <Search className="absolute top-2.5 left-7 size-4 text-muted-foreground" />
          <Input
            placeholder="Corte y barba..."
            className="pl-9"
            role="search"
          />
        </div>
      </header>

      <main className="grid grid-cols-1 gap-x-6 gap-y-8 px-8 md:grid-cols-2 lg:grid-cols-3">
        {barbershops.map((barbershop) => (
          <Card
            className="shadow-sm transition-shadow hover:shadow-md"
            key={barbershop._id}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <Store className="mt-1.5 size-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-balance font-bold text-xl tracking-tight">
                      {barbershop.name}
                    </CardTitle>
                    <p className="text-muted-foreground text-sm">
                      {barbershop.city}, {barbershop.state}
                    </p>
                  </div>
                </div>
              </div>
              <CardDescription>{barbershop.description}</CardDescription>
              <CardDescription>
                {barbershop.address.fullAddress}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {barbershop.services?.length} servicios
                </span>
              </div>
            </CardContent>
            <CardFooter>
              <Rating value={barbershop.metadata?.rating ?? 0} readOnly>
                {[1, 2, 3, 4, 5].map((star) => (
                  <RatingButton key={star} />
                ))}
                <span className="ml-2 text-muted-foreground text-sm">
                  {barbershop.metadata?.rating ?? 0} estrellas
                </span>
              </Rating>
            </CardFooter>
          </Card>
        ))}
      </main>
    </div>
  );
}
