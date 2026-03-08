/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { FieldGroup } from "@/components/ui/field";
import { resetPassword } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

interface ResetPasswordFormProps {
  token: string;
}

export const ResetPasswordForm = ({ token }: ResetPasswordFormProps) => {
  const navigate = useNavigate();
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
      onSubmit: resetPasswordSchema,
    },
    defaultValues: {
      password: "",
      confirmPassword: "",
      token,
    },
    onSubmit: async ({ value }) => {
      if (!token) {
        toast.error("Token de restablecimiento inválido");
        haptic.trigger("error");
        return;
      }

      try {
        const { error, data } = await resetPassword({
          newPassword: value.password,
          token,
        });

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
          haptic.trigger("error");
          return;
        }

        if (data) {
          toast.success(
            "¡Contraseña restablecida! Inicia sesión para continuar.",
          );
          haptic.trigger("success");
          form.reset();
          navigate({ to: "/login", replace: true });
        }
      } catch (error: unknown) {
        haptic.trigger("error");
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al restablecer la contraseña");
          return;
        }
        toast.error("Error al restablecer la contraseña");
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
        <form.AppField name="password">
          {(field) => (
            <field.PasswordField
              label="Nueva contraseña"
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
      </FieldGroup>

      <form.AppForm>
        <form.SubmitButton label="Restablecer contraseña" className="w-full" />
      </form.AppForm>
    </form>
  );
};
