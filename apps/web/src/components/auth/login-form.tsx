/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { signIn } from "@panabarbero/convex/auth";
import { useForm } from "@tanstack/react-form";
import { Link, useRouter } from "@tanstack/react-router";
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
import { loginFormSchema } from "@/lib/auth-schemas";

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const formId = useId();

  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: loginFormSchema,
    },
    formId,
    onSubmit: async ({ value }) => {
      try {
        const { data } = await signIn.email({
          email: value.email,
          password: value.password,
          rememberMe: true,
        });

        if (data?.redirect) {
          router.navigate({
            to: "/profile",
            search: { tab: "account" },
            replace: true,
          });
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al iniciar sesión");
          return;
        }
      }
      toast.error("Error al iniciar sesión");
      return;
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
      <FieldGroup>
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
                />
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            );
          }}
        />
        <form.Field
          name="password"
          children={(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name}>
                  Contraseña
                  <Link
                    to="/forgot-password"
                    className="ml-auto text-foreground text-xs underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </FieldLabel>

                <div className="relative w-full">
                  <Input
                    type={showPassword ? "text" : "password"}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    autoComplete="current-password"
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
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
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
      </FieldGroup>

      <Button type="submit">Iniciar sesión</Button>
    </form>
  );
};
