import { SiApple, SiGoogle } from "@icons-pack/react-simple-icons";
import { signIn } from "@panabarbero/convex/auth";
import {
  createFileRoute,
  redirect,
  useCanGoBack,
  useRouter,
} from "@tanstack/react-router";
import { ArrowLeft, KeyRound } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Provider = "google" | "apple" | "passkey";

function LoginPage() {
  const { data: user } = useSession();

  const canGoBack = useCanGoBack();
  const router = useRouter();

  if (user) {
    throw redirect({
      to: "/barbershops",
      search: { city: "Barrancabermeja", state: "Santander" },
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
              to: "/profile",
            });
          },
        },
      });

      if (error) {
        toast.error(error.message ?? "Error al iniciar sesión");
        return;
      }
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-65px)] flex-col items-center justify-center bg-background">
      <div className="flex w-full flex-col items-center justify-center">
        {canGoBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="size-4" /> Volver
          </Button>
        )}
        <div className="flex min-h-96 w-full max-w-sm flex-col items-center justify-start gap-4 rounded-lg border bg-accent/20 shadow-sm sm:max-w-sm">
          <header
            className="w-full space-y-2 border-b p-4"
            style={{ viewTransitionName: "login" }}
          >
            <h1 className="text-balance text-center font-bold text-3xl tracking-tighter">
              Accede a tu cuenta
            </h1>
            <p className="text-pretty text-center text-muted-foreground text-sm tracking-tight">
              Inicia sesión para agendar y gestionar tus citas.
            </p>
          </header>

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
    </div>
  );
}
