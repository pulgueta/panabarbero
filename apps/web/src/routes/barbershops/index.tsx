import {
  activeBarbershopsQueryOptions,
  useActiveBarbershops,
} from "@panabarbero/client/hooks";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Scissors, Search } from "lucide-react";

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
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/barbershops/")({
  component: BarbershopsPage,
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(
      activeBarbershopsQueryOptions(),
    );
  },
  pendingComponent: () => <div>Loading...</div>,
});

function BarbershopsPage() {
  const { data: barbershops } = useActiveBarbershops();

  return (
    <div className="container mx-auto min-h-[calc(100dvh-65px)] border-x">
      <header className="flex flex-col items-center justify-between gap-2.5 border-b py-12 md:py-16">
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

      <main className="grid grid-cols-1 gap-x-6 gap-y-8 px-4 py-8 sm:grid-cols-2 md:px-8 lg:grid-cols-3">
        {barbershops.map((barbershop) => (
          <Card
            className="shadow-sm transition-shadow hover:shadow-md"
            key={barbershop._id}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-2.5">
                  <Scissors className="mt-1.5 size-5 text-muted-foreground" />
                  <div>
                    <CardTitle className="text-balance font-bold text-xl tracking-tight">
                      {barbershop.name}
                    </CardTitle>
                    <p className="text-muted-foreground text-xs">
                      {barbershop.city}, {barbershop.state}
                    </p>
                  </div>
                </div>
              </div>
              <CardDescription>
                {barbershop.address.fullAddress}
              </CardDescription>
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
    </div>
  );
}
