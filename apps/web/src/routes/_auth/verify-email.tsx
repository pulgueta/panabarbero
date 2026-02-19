import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { verifyEmail } from "@/lib/auth-client";
import { translateBetterAuthError } from "@/lib/better-auth-errors";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { CheckCircleIcon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_auth/verify-email")({
  component: VerifyEmailPage,
  pendingComponent: LoadingComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
    };
  },
  loaderDeps: ({ search }) => ({
    token: search.token as string | undefined,
  }),
  loader: ({ deps }) => {
    if (!deps.token) {
      throw redirect({ to: "/login" });
    }
  },
});

type VerificationStatus = "verifying" | "success" | "error";

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    const runVerification = async () => {
      if (!token) {
        return;
      }

      const { error } = await verifyEmail({
        query: { token },
      });

      if (!isMounted) {
        return;
      }

      if (error?.code) {
        setStatus("error");
        setErrorMessage(
          translateBetterAuthError(error.code) ??
            "No pudimos verificar tu correo electrónico.",
        );
        return;
      }

      setStatus("success");
    };

    void runVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            {status === "success" && (
              <div className="mx-auto flex size-6 items-center justify-center">
                <CheckCircleIcon className="size-8 text-green-600 dark:text-green-400" />
              </div>
            )}
            {status === "error" && (
              <div className="mx-auto flex size-6 items-center justify-center">
                <XCircleIcon className="size-8 text-red-600 dark:text-red-400" />
              </div>
            )}
            <CardTitle className="text-xl">
              {status === "success" && "Correo verificado"}
              {status === "error" && "No pudimos verificar tu correo"}
              {status === "verifying" && "Verificando tu correo"}
            </CardTitle>
            <CardDescription>
              {status === "verifying" &&
                "Esto puede tardar unos segundos. No cierres esta página."}
              {status === "success" &&
                "Tu correo electrónico fue verificado correctamente."}
              {status === "error" &&
                "El enlace puede haber expirado o ser inválido."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              {status === "verifying" && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Spinner />
                  Verificando tu correo...
                </div>
              )}

              {status === "error" && errorMessage && (
                <p className="text-center text-muted-foreground text-sm">
                  {errorMessage}
                </p>
              )}
            </FieldGroup>
          </CardContent>
          {(status === "success" || status === "error") && (
            <CardFooter className="justify-center">
              <Button asChild variant="outline">
                <Link to="/login">Ir al inicio de sesión</Link>
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </BorderContainer>
  );
}
