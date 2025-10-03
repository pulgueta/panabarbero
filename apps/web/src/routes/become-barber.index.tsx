import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/become-barber/")({
  component: BecomeBarberPage,
});

function BecomeBarberPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Convertirse en Barbero</h1>
      <p className="text-muted-foreground">
        Esta página permitirá a los usuarios registrarse como barberos.
      </p>
    </div>
  );
}
