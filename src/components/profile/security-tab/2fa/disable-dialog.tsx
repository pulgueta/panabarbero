import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import { startTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
} from "@/components/ui/responsive-modal";
import { Spinner } from "@/components/ui/spinner";
import { twoFactor } from "@/lib/auth-client";
import { disableTwoFactorSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

interface DisableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DisableDialog: FC<DisableDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const form = useForm({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    try {
      const { data, error } = await twoFactor.disable({ password });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      if (data) {
        toast.success("2FA desactivado correctamente");
        startTransition(() => {
          onOpenChange(false);
          form.reset();
        });
        return;
      }
    } catch (error) {
      toast.error("Error al desactivar 2FA. Verifica tu contraseña.");
      console.error(error);
    }
  });

  return (
    <ResponsiveModal open={open} onOpenChange={onOpenChange}>
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>Desactivar 2FA</ResponsiveModalTitle>
          <ResponsiveModalDescription>
            ¿Estás seguro de que quieres desactivar la autenticación de dos
            factores? La seguridad de tu cuenta se verá afectada.
          </ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>
                    Contraseña actual
                  </FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    type="password"
                    placeholder="••••••••"
                    aria-invalid={fieldState.invalid}
                    disabled={form.formState.isSubmitting}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
          <ResponsiveModalFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                form.reset();
              }}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting && <Spinner />}
              Desactivar 2FA
            </Button>
          </ResponsiveModalFooter>
        </form>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
