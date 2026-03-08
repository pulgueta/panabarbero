/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { revalidateLogic } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

import { useAppForm } from "@/components/form/use-form";
import { requestPasswordReset } from "@/lib/auth-client";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

export const ForgotPasswordForm = () => {
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
      onSubmit: forgotPasswordSchema,
    },
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      try {
        const { error } = await requestPasswordReset({
          email: value.email,
          redirectTo: "/reset-password",
        });

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
          haptic.trigger("error");
          return;
        }

        toast.success("Correo enviado con éxito");
        haptic.trigger("success");
        form.reset();
        navigate({ to: "/login", replace: true });
      } catch (error: unknown) {
        haptic.trigger("error");
        if (error instanceof Error) {
          toast.error(error.message ?? "Error al enviar el correo");
          return;
        }
        toast.error("Error al enviar el correo");
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
      <form.AppField name="email">
        {(field) => (
          <field.TextField
            label="Correo electrónico"
            placeholder="tu@correo.com"
            autoComplete="email"
          />
        )}
      </form.AppField>

      <form.AppForm>
        <form.SubmitButton label="Enviar enlace" className="w-full" />
      </form.AppForm>
    </form>
  );
};
