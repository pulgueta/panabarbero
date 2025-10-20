import { SiApple, SiGoogle } from "@icons-pack/react-simple-icons";
import { signIn, useSession } from "@panabarbero/convex/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Provider = "google" | "apple" | "passkey";

function LoginPage() {
  const { data: session } = useSession();

  if (session?.user) {
    throw redirect({
      to: "/barbershops",
      search: {
        city: undefined,
        state: undefined,
      },
    });
  }

  const handleSignIn = async (provider: Provider) => {
    if (provider === "passkey") {
      await signIn.passkey({
        autoFill: true,
      });
    } else {
      const { error } = await signIn.social({
        provider,
        fetchOptions: {
          onSuccess: () => {
            redirect({
              to: "/barbershops",
              search: {
                city: undefined,
                state: undefined,
              },
            });
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center bg-background">
      <div className="flex min-h-96 w-full max-w-sm flex-col items-center justify-start gap-4 rounded-lg bg-accent/20 p-4 shadow-sm">
        <header>
          <h1 className="text-balance text-center font-bold text-3xl tracking-tight">
            Iniciar sesión
          </h1>
          <p className="text-pretty text-center text-muted-foreground text-sm">
            Inicia sesión para continuar
          </p>
        </header>

        <Separator className="mb-4 w-full opacity-50" />

        <div className="flex w-full max-w-64 flex-col gap-2.5">
          <Button size="sm" onClick={() => handleSignIn("google")}>
            <SiGoogle className="size-4" />
            Google
          </Button>
          <Button size="sm" disabled onClick={() => handleSignIn("apple")}>
            <SiApple className="size-4" />
            Apple (muy pronto)
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleSignIn("passkey")}
          >
            <KeyRound className="size-4" />
            Biometría
          </Button>
        </div>
      </div>
    </div>
  );
}
