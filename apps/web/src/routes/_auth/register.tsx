/** biome-ignore-all lint/correctness/useUniqueElementIds: not needed */

import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { GalleryVerticalEnd } from "lucide-react";

import { FormFooter } from "@/components/auth/form-footer";
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
      <Link
        to="/"
        className="flex items-center gap-2 self-center font-semibold text-xl tracking-tighter"
        style={{ viewTransitionName: "logo" }}
      >
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GalleryVerticalEnd className="size-4" />
        </div>
        PanaBarbero
      </Link>

      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Regístrate</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <RegisterForm />

              <p className="text-center text-muted-foreground text-xs">
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
