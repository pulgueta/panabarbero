import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useReducer } from "react";

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
import { tokenSchema } from "@/lib/schemas";

export const Route = createFileRoute("/_auth/verify-email")({
  component: VerifyEmailPage,
  pendingComponent: LoadingComponent,
  validateSearch: tokenSchema,
  loaderDeps: ({ search }) => ({
    token: search.token,
  }),
  ssr: "data-only",
  loader: ({ deps }) => {
    if (!deps.token) {
      throw redirect({ to: "/login" });
    }
  },
});

type VerificationStatus = "verifying" | "success" | "error";
type State = { status: VerificationStatus; errorMessage: string };
type Action = { type: "success" } | { type: "error"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "success":
      return { status: "success", errorMessage: "" };
    case "error":
      return { status: "error", errorMessage: action.message };
    default:
      return state;
  }
}

function VerifyEmailPage() {
  const { token } = Route.useSearch();
  const [{ status, errorMessage }, dispatch] = useReducer(reducer, {
    status: "verifying",
    errorMessage: "",
  });

  useEffect(() => {
    if (!token) return;

    const abortController = new AbortController();

    const runVerification = async () => {
      try {
        const { error } = await verifyEmail({
          query: { token },
          fetchOptions: { signal: abortController.signal },
        });

        if (error?.code) {
          dispatch({
            type: "error",
            message:
              translateBetterAuthError(error.code) ??
              "No pudimos verificar tu correo electrónico.",
          });
          return;
        }

        dispatch({ type: "success" });
      } catch {
        // Aborted requests reject — ignore them.
      }
    };

    void runVerification();

    return () => {
      abortController.abort();
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
                  Verificando tu correo…
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
              <Button
                variant="outline"
                nativeButton={false}
                render={<Link to="/login" />}
              >
                Ir al inicio de sesión
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </BorderContainer>
  );
}
