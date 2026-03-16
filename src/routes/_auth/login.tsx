/** biome-ignore-all lint/correctness/useUniqueElementIds: not needed */

import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useState } from "react";
import { toast } from "sonner";

import { FormHeader } from "@/components/auth/form-header";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { GoogleIcon } from "@/components/ui/google-icon";
import { Skeleton } from "@/components/ui/skeleton";
import { signIn } from "@/lib/auth-client";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

const LoginForm = lazy(() =>
  import("@/components/auth/login-form").then((module) => ({
    default: module.LoginForm,
  })),
);

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
  pendingComponent: LoadingComponent,
});

type Provider = "google" | "apple" | "passkey" | "facebook";

function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const oauthProviderLabel = (provider: Provider) => {
    const baseLabel = "Iniciar sesión con";

    switch (provider) {
      case "google":
        return `${baseLabel} Google`;
      default:
        return baseLabel;
    }
  };

  const handleSignIn = async (provider: Provider) => {
    if (provider === "passkey") {
      await signIn.passkey({
        autoFill: true,
      });
    } else {
      setIsSigningIn(true);
      try {
        const { error } = await signIn.social({
          provider,
        });

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
          return;
        }
      } finally {
        setIsSigningIn(false);
      }
    }
  };

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <FormHeader />

      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl tracking-tight">
              Iniciar sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <div className="grid grid-cols-1 gap-4">
                <Button
                  variant="outline"
                  type="button"
                  disabled={isSigningIn}
                  onClick={() => handleSignIn("google")}
                >
                  {isSigningIn ? <Spinner /> : <GoogleIcon />}
                  {oauthProviderLabel("google")}
                </Button>
                {/* <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleSignIn("passkey")}
                >
                  <FingerprintIcon />
                  Iniciar sesión con biometría
                </Button> */}
              </div>

              <Suspense
                fallback={<Skeleton className="h-64 w-full max-w-xl" />}
              >
                <LoginForm />
              </Suspense>
            </FieldGroup>
          </CardContent>
          <CardFooter className="justify-center py-4">
            <p className="text-center text-muted-foreground text-sm">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                viewTransition={{ types: ["warp-in"] }}
                className="text-primary underline-offset-4 hover:underline"
              >
                Regístrate
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </BorderContainer>
  );
}
