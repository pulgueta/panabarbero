import type { Barbershop } from "@panabarbero/convex/schemas";
import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "react";

import { BarbershopsDropdown } from "@/components/barbershops/barbershops-dropdown";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useBarbershopsByOwnerId } from "@/hooks/barbershop/use-barbershop";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/barbershops/analytics")({
  component: AnalyticsPage,
  pendingComponent: LoadingComponent,
  validateSearch: (search?: { barbershopId?: Barbershop["_id"] }) => {
    return {
      barbershopId: search?.barbershopId,
    };
  },
});

function AnalyticsPage() {
  const { barbershopId } = Route.useSearch();

  const { data: user } = useSession();
  const { data: barbershops, isLoading } = useBarbershopsByOwnerId(
    user?.userId ?? "",
  );

  const current =
    (barbershops ?? []).find((b) => b._id === barbershopId) ??
    (barbershops ?? [])[0];

  const completed = current?.metadata?.completedAppointments ?? 0;
  const reviews = current?.metadata?.reviews ?? 0;
  const rating = current?.metadata?.rating ?? 0;
  const ratingPct = Math.min(100, Math.max(0, (rating / 5) * 100));

  return (
    <BorderContainer className="space-y-6">
      <section className="flex w-full flex-col justify-between gap-4">
        <div className="flex w-full items-center justify-between gap-4">
          <h1 className="font-bold text-3xl tracking-tight">Analíticas</h1>

          <Activity mode={barbershops?.length ? "visible" : "hidden"}>
            <BarbershopsDropdown
              barbershops={barbershops?.length ? barbershops : []}
              isLoading={isLoading}
            />
          </Activity>
        </div>
      </section>

      <Separator />

      {isLoading || !current ? (
        <Skeleton className="h-48 w-full" />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">{current.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="font-bold text-2xl tabular-nums">
                    {completed}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Citas completadas
                  </div>
                </div>
                <div>
                  <div className="font-bold text-2xl tabular-nums">
                    {reviews}
                  </div>
                  <div className="text-xs text-muted-foreground">Reseñas</div>
                </div>
                <div>
                  <div className="font-bold text-2xl tabular-nums">
                    {rating.toFixed(1)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Calificación
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 text-sm">Rating</div>
                <div className="h-2 w-full rounded bg-muted">
                  <div
                    className="h-2 rounded bg-primary"
                    style={{ width: `${ratingPct}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </BorderContainer>
  );
}
