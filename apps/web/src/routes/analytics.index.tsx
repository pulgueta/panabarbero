import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/analytics/")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Analíticas</h1>
      <p className="text-muted-foreground">
        Esta página mostrará las analíticas de la barbería.
      </p>
    </div>
  );
}
