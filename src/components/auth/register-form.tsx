/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { revalidateLogic } from "@tanstack/react-form";
import { useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { signUp } from "@/lib/auth-client";
import { registerFormSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

export const RegisterForm = () => {
  const router = useRouter();
  const haptic = useWebHaptics();

  const form = useAppForm({
    onSubmitInvalid: () => {
      haptic.trigger("error");
    },
    validationLogic: revalidateLogic({
      mode: "submit",
      modeAfterSubmission: "change",
    }),
    validators: {
      onSubmit: registerFormSchema,
    },
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { data, error } = await signUp.email({
          email: value.email,
          password: value.password,
          name: value.name,
          callbackURL: "/login",
        });

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
          haptic.trigger("error");
          return;
        }

        if (data?.user) {
          toast.success("¡Cuenta creada! Verifica tu correo electrónico.");
          haptic.trigger("success");
          form.reset();
          router.navigate({
            to: "/login",
            replace: true,
          });
        }
      } catch (error: unknown) {
        haptic.trigger("error");
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
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex flex-col gap-4"
    >
      <FieldGroup className="grid grid-cols-1 gap-4">
        <form.AppField name="name">
          {(field) => (
            <field.TextField
              label="Nombre y apellido"
              placeholder="Juan Pérez"
              autoComplete="name"
            />
          )}
        </form.AppField>

        <form.AppField name="email">
          {(field) => (
            <field.TextField
              label="Correo electrónico"
              placeholder="tu@correo.com"
              autoComplete="email"
            />
          )}
        </form.AppField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <form.AppField name="password">
            {(field) => (
              <field.PasswordField
                label="Contraseña"
                autoComplete="new-password"
              />
            )}
          </form.AppField>

          <form.AppField name="confirmPassword">
            {(field) => (
              <field.PasswordField
                label="Confirmar contraseña"
                autoComplete="new-password"
              />
            )}
          </form.AppField>
        </div>
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Crear cuenta" className="w-full" />
      </form.AppForm>
    </form>
  );
};
