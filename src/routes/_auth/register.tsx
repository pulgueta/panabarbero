/** biome-ignore-all lint/correctness/useUniqueElementIds: not needed */

import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

import { FormFooter } from "@/components/auth/form-footer";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";

const RegisterForm = lazy(() =>
  import("@/components/auth/register-form").then((module) => ({
    default: module.RegisterForm,
  })),
);

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
  pendingComponent: LoadingComponent,
});

function RegisterPage() {
  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl tracking-tight">Regístrate</CardTitle>
          </CardHeader>
          <Suspense fallback={<Skeleton className="h-96 w-full max-w-xl" />}>
            <CardContent>
              <FieldGroup className="gap-2">
                <RegisterForm />

                <p className="pt-4 text-center text-muted-foreground text-sm">
                  ¿Ya tienes una cuenta?{" "}
                  <Link
                    to="/login"
                    viewTransition={{ types: ["warp-out"] }}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </FieldGroup>
            </CardContent>
            <FormFooter />
          </Suspense>
        </Card>
      </div>
    </BorderContainer>
  );
}
