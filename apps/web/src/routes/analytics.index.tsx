import { convexQuery } from "@convex-dev/react-query";
import { api } from "@panabarbero/convex/api";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/")({
  component: AnalyticsPage,
  loader: async (opts) => {
    await opts.context.queryClient.ensureQueryData(
      convexQuery(api.barbershops.getBarbershops, {}),
    );
  },
});

function AnalyticsPage() {
  const { data: barbershops } = useSuspenseQuery(
    convexQuery(api.barbershops.getBarbershops, {}),
  );

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Analíticas</h1>
      <p className="text-muted-foreground">
        Esta página mostrará las analíticas de la barbería.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {barbershops.map((barbershop) => (
          <div key={barbershop._id}>
            <h2 className="font-bold text-lg">{barbershop.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
