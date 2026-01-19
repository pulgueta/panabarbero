/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { zodResolver } from "@hookform/resolvers/zod";
import { resetPassword } from "@panabarbero/convex/auth";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormHeader } from "@/components/auth/form-header";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
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
import { resetPasswordSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

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
  const navigate = Route.useNavigate();

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
      token,
    },
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = form.handleSubmit(async ({ password }) => {
    if (!token) {
      toast.error("Token de restablecimiento inválido");
      return;
    }

    try {
      const { error, data } = await resetPassword({
        newPassword: password,
        token,
      });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      if (data) {
        toast.success("¡Contraseña restablecida! Bienvenido a PanaBarbero.");
        navigate({ to: "/login" });
        return;
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message ?? "Error al restablecer la contraseña");
        return;
      }
      toast.error("Error al restablecer la contraseña");
    }
  });

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
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <FieldGroup className="gap-4">
                <Controller
                  name="password"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Nueva contraseña
                      </FieldLabel>
                      <div className="relative w-full">
                        <Input
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          autoComplete="new-password"
                          placeholder="********"
                          maxLength={64}
                          type={showPassword ? "text" : "password"}
                        />
                        <button
                          type="button"
                          className={buttonVariants({
                            className: "absolute top-0.5 right-0.5",
                            size: "icon",
                            variant: "ghost",
                          })}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        >
                          {showPassword ? (
                            <EyeOffIcon size={16} />
                          ) : (
                            <EyeIcon size={16} />
                          )}
                        </button>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="confirmPassword"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor={field.name}>
                        Confirmar contraseña
                      </FieldLabel>
                      <div className="relative w-full">
                        <Input
                          {...field}
                          id={field.name}
                          aria-invalid={fieldState.invalid}
                          autoComplete="new-password"
                          placeholder="********"
                          maxLength={64}
                          type={showConfirmPassword ? "text" : "password"}
                        />
                        <button
                          type="button"
                          className={buttonVariants({
                            className: "absolute top-0.5 right-0.5",
                            size: "icon",
                            variant: "ghost",
                          })}
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        >
                          {showConfirmPassword ? (
                            <EyeOffIcon size={16} />
                          ) : (
                            <EyeIcon size={16} />
                          )}
                        </button>
                      </div>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </FieldGroup>

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Spinner />}
                Restablecer contraseña
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}
