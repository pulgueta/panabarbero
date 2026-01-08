/** biome-ignore-all lint/correctness/useUniqueElementIds: not needed */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";

import { FormFooter } from "@/components/auth/form-footer";
import { FormHeader } from "@/components/auth/form-header";
import { RegisterForm } from "@/components/auth/register-form";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldGroup } from "@/components/ui/field";

export const Route = createFileRoute("/_auth/register")({
  component: RegisterPage,
  pendingComponent: LoadingComponent,
});

function RegisterPage() {
  const router = useRouter();

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <FormHeader />

      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl tracking-tight">Regístrate</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <RegisterForm />

              <p className="text-center text-muted-foreground text-sm">
                ¿Ya tienes una cuenta?{" "}
                <Link
                  to="/login"
                  viewTransition={{ types: ["warp-out"] }}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Inicia sesión
                </Link>
              </p>

              <FormFooter />
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}
