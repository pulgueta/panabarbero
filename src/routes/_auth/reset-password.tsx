import { createFileRoute, redirect } from "@tanstack/react-router";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FormHeader } from "@/components/auth/form-header";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const Route = createFileRoute("/_auth/reset-password")({
  component: ResetPasswordPage,
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

function ResetPasswordPage() {
  const { token } = Route.useSearch();

  if (!token) {
    return null;
  }

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <FormHeader />

      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Crea una nueva contraseña</CardTitle>
            <CardDescription>
              Ingresa tu nueva contraseña. Asegúrate de que sea segura y fácil
              de recordar.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm token={token} />
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}
