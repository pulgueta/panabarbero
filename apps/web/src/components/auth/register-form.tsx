/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { signUp } from "@panabarbero/convex/auth";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { registerFormSchema } from "@/lib/auth-schemas";

export const RegisterForm = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] =
    useState<boolean>(false);

  const formId = useId();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validators: {
      onSubmit: registerFormSchema,
    },
    formId,
    onSubmit: async ({ value }) => {
      try {
        const { data } = await signUp.email({
          email: value.email,
          password: value.password,
          name: value.name,
        });

        if (data?.user) {
          // Show success message about email verification
          toast.success(
            "¡Cuenta creada! Revisa tu correo para verificar tu cuenta.",
          );

          form.reset();

          navigate({
            to: "/profile",
            search: { tab: "account" },
            replace: true,
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al crear la cuenta");
          return;
        }
        toast.error("Error al crear la cuenta");
      }
    },
  });

  return (
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
          name="name"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Nombre y apellido</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="Juan Pérez"
                  autoComplete="name"
                  maxLength={255}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="email"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>Correo electrónico</FieldLabel>
                <Input
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  aria-invalid={isInvalid}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  maxLength={255}
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form.Field
            name="password"
            children={(field) => {
              const isInvalid =
                field.state.meta.isTouched && !field.state.meta.isValid;

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={field.name}>Contraseña</FieldLabel>

                  <div className="relative w-full">
                    <Input
                      type={showPassword ? "text" : "password"}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                      placeholder="********"
                      maxLength={64}
                      max={64}
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

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
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
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      autoComplete="new-password"
                      placeholder="********"
                      maxLength={64}
                      max={64}
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

                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          />
        </div>
      </FieldGroup>

      <Button type="submit" disabled={form.state.isSubmitting}>
        {form.state.isSubmitting && <Spinner />}
        Crear cuenta
      </Button>
    </form>
  );
};
