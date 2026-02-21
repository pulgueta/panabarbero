/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

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
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeftIcon, CheckCircleIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

export const Route = createFileRoute("/_auth/forgot-password")({
  component: ForgotPasswordPage,
  pendingComponent: LoadingComponent,
});

function ForgotPasswordPage() {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const form = useForm({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      const { error } = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      setSubmittedEmail(email);
      setIsSubmitted(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? "Error al enviar el correo");
        return;
      }
      toast.error("Error al enviar el correo");
    }
  });

  if (isSubmitted) {
    return (
      <BorderContainer className="flex flex-col items-center justify-center gap-4">
        <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
          <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircleIcon className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">Revisa tu correo</CardTitle>
              <CardDescription>
                Hemos enviado un enlace para restablecer tu contraseña a{" "}
                <span className="font-medium text-foreground">
                  {submittedEmail}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <p className="text-center text-muted-foreground text-sm">
                  Si no recibes el correo en unos minutos, revisa tu carpeta de
                  spam o{" "}
                  <button
                    type="button"
                    onClick={() => setIsSubmitted(false)}
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    intenta de nuevo
                  </button>
                </p>

                <Button
                  variant="outline"
                  className="mt-4 w-full"
                  render={<Link to="/login" />}
                >
                  <ArrowLeftIcon className="size-4" />
                  Volver al inicio de sesión
                </Button>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </BorderContainer>
    );
  }

  return (
    <BorderContainer className="flex flex-col items-center justify-center gap-4">
      <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
        <Card className="w-full max-w-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">¿Olvidaste tu contraseña?</CardTitle>
            <CardDescription>
              Ingresa tu correo electrónico y te enviaremos un enlace para
              restablecer tu contraseña.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <FieldGroup className="gap-4">
                <Controller
                  name="email"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Correo electrónico
                      </FieldLabel>
                      <Input
                        {...field}
                        id={field.name}
                        aria-invalid={fieldState.invalid}
                        placeholder="tu@correo.com"
                        autoComplete="email"
                      />
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Enviar enlace
              </Button>
            </form>
          </CardContent>
          <CardFooter className="justify-center py-4">
            <Link
              to="/login"
              className="text-center text-primary text-sm underline-offset-4 hover:underline"
            >
              Inicia sesión
            </Link>
          </CardFooter>
        </Card>
      </div>
    </BorderContainer>
  );
}
