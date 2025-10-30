import { signOut } from "@panabarbero/convex/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profile/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { data: user } = useSession();

  if (!user) {
    throw redirect({
      to: "/login",
    });
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 font-bold text-3xl">Mi Perfil</h1>
      <p className="text-muted-foreground">
        Esta página mostrará la información del perfil del usuario.
      </p>

      <Button variant="destructive" onClick={() => signOut()}>
        Cerrar sesión
      </Button>
    </div>
  );
}
