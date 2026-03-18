import { createFileRoute, Link } from "@tanstack/react-router";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_auth/forgot-password")({
  component: ForgotPasswordPage,
  pendingComponent: LoadingComponent,
  ssr: "data-only",
});

function ForgotPasswordPage() {
  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription>
              Ingresa tu correo electrónico y te enviaremos un enlace para
              restablecerla.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ForgotPasswordForm />
          </CardContent>
          <CardFooter className="justify-center py-4">
            <Link
              to="/login"
              className="text-muted-foreground text-sm underline-offset-4 hover:underline"
              viewTransition={{ types: ["warp-in"] }}
            >
              Inicia sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </BorderContainer>
  );
}
