/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "@panabarbero/convex/auth";
import { Link, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
    resolver: zodResolver(loginFormSchema),
  });

  const onSubmit = form.handleSubmit(
    async ({ email, password, rememberMe }) => {
      try {
        await signIn.email(
          {
            email,
            password,
            rememberMe,
          },
          {
            onSuccess: () => {
              router.navigate({
                to: "/profile",
                search: { tab: "account" },
                replace: true,
              });
            },
          },
        );
      } catch (error: unknown) {
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al iniciar sesión");
          return;
        }
        toast.error("Error al iniciar sesión");
      }
    },
  );

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup className="grid grid-cols-1 gap-4">
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Correo electrónico</FieldLabel>
              <Input
                {...field}
                id={field.name}
                aria-invalid={fieldState.invalid}
                placeholder="tu@correo.com"
                autoComplete="email"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <div className="space-y-4">
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>
                  Contraseña
                  <Link
                    to="/forgot-password"
                    className="ml-auto font-light text-muted-foreground text-xs underline-offset-4 hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </FieldLabel>
                <div className="relative w-full">
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="********"
                    autoComplete="current-password"
                    maxLength={64}
                    max={64}
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Controller
            name="rememberMe"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} orientation="horizontal">
                <Checkbox
                  id={field.name}
                  name={field.name}
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked)}
                  aria-invalid={fieldState.invalid}
                />

                <FieldLabel htmlFor={field.name}>Recordarme</FieldLabel>
              </Field>
            )}
          />
        </div>
      </FieldGroup>

      <Button type="submit">Iniciar sesión</Button>
    </form>
  );
};
