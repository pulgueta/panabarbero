/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { resetPassword } from "@panabarbero/convex/auth";
import { useForm } from "@tanstack/react-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircleIcon,
  EyeIcon,
  EyeOffIcon,
  XCircleIcon,
} from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { object, string } from "zod";

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

export const Route = createFileRoute("/_auth/reset-password")({
  component: ResetPasswordPage,
  pendingComponent: LoadingComponent,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      token: search.token as string | undefined,
    };
  },
});

const resetPasswordSchema = object({
  password: string({ message: "La contraseña es requerida" })
    .min(4, "La contraseña debe tener al menos 4 caracteres")
    .max(255, "La contraseña no puede tener más de 255 caracteres"),
  confirmPassword: string({
    message: "La confirmación de contraseña es requerida",
  })
    .min(4, "La confirmación de contraseña es requerida")
    .max(
      255,
      "La confirmación de contraseña no puede tener más de 255 caracteres",
    ),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

function ResetPasswordPage() {
  const { token } = Route.useSearch();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const formId = useId();

  const form = useForm({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: resetPasswordSchema,
    },
    formId,
    onSubmit: async ({ value }) => {
      if (!token) {
        toast.error("Token de restablecimiento inválido");
        return;
      }

      try {
        const { error } = await resetPassword({
          newPassword: value.password,
          token,
        });

        if (error) {
          toast.error(error.message ?? "Error al restablecer la contraseña");
          return;
        }

        setIsSuccess(true);
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al restablecer la contraseña");
          return;
        }
        toast.error("Error al restablecer la contraseña");
      }
    },
  });

  if (!token) {
    return (
      <BorderContainer className="flex flex-col items-center justify-center gap-4">
        <FormHeader />

        <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
          <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <XCircleIcon className="size-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl">Enlace inválido</CardTitle>
              <CardDescription>
                El enlace para restablecer tu contraseña es inválido o ha
                expirado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Button asChild className="w-full">
                  <Link to="/forgot-password">Solicitar nuevo enlace</Link>
                </Button>

                <p className="text-center text-muted-foreground text-sm">
                  <Link
                    to="/login"
                    className="text-primary underline-offset-4 hover:underline"
                  >
                    Volver al inicio de sesión
                  </Link>
                </p>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>
      </BorderContainer>
    );
  }

  if (isSuccess) {
    return (
      <BorderContainer className="flex flex-col items-center justify-center gap-4">
        <FormHeader />

        <div className="flex w-full max-w-xl flex-col gap-4 [view-transition-name:main-content]">
          <Card className="w-full max-w-xl">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircleIcon className="size-8 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-xl">
                ¡Contraseña restablecida!
              </CardTitle>
              <CardDescription>
                Tu contraseña ha sido actualizada correctamente. Ya puedes
                iniciar sesión con tu nueva contraseña.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full"
                onClick={() => navigate({ to: "/login" })}
              >
                Iniciar sesión
              </Button>
            </CardContent>
          </Card>
        </div>
      </BorderContainer>
    );
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
            <form
              id={formId}
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="flex flex-col gap-4"
            >
              <FieldGroup className="gap-4">
                <form.Field
                  name="password"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Nueva contraseña
                        </FieldLabel>
                        <div className="relative w-full">
                          <Input
                            type={showPassword ? "text" : "password"}
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="new-password"
                            placeholder="********"
                            maxLength={64}
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
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
                <form.Field
                  name="confirmPassword"
                  children={(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && !field.state.meta.isValid;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>
                          Confirmar contraseña
                        </FieldLabel>
                        <div className="relative w-full">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            id={field.name}
                            name={field.name}
                            value={field.state.value}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            aria-invalid={isInvalid}
                            autoComplete="new-password"
                            placeholder="********"
                            maxLength={64}
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
                        {isInvalid && (
                          <FieldError errors={field.state.meta.errors} />
                        )}
                      </Field>
                    );
                  }}
                />
              </FieldGroup>

              <Button type="submit">Restablecer contraseña</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </BorderContainer>
  );
}
