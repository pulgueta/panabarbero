import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Mi Perfil</h1>
      <p className="text-muted-foreground">
        Esta página mostrará la información del perfil del usuario.
      </p>
    </div>
  );
}
