import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/barbershop-settings/")({
  component: BarbershopSettingsPage,
});

function BarbershopSettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Configuración de Barbería</h1>
      <p className="text-muted-foreground">
        Esta página permitirá configurar los detalles de la barbería.
      </p>
    </div>
  );
}
