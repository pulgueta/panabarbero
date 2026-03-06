import { Button, buttonVariants } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { twoFactor } from "@/lib/auth-client";
import { twoFactorPasswordSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";
import { zodResolver } from "@hookform/resolvers/zod";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import type { FC } from "react";
import { startTransition, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface PasswordStepProps {
  onNext: (totpUri: string, backupCodes: string[]) => void;
  onCancel: () => void;
}

export const PasswordStep: FC<PasswordStepProps> = ({ onNext, onCancel }) => {
  const [showPassword, setShowPassword] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleSubmit = form.handleSubmit(async ({ password }) => {
    try {
      const { data, error } = await twoFactor.enable({
        password,
      });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      if (data?.totpURI) {
        startTransition(() => {
          onNext(data.totpURI, data.backupCodes ?? []);
        });
        return;
      }
    } catch (error) {
      toast.error("Error al activar 2FA. Verifica tu contraseña.");
      console.error(error);
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Activar 2FA</DialogTitle>
        <DialogDescription>
          Ingresa tu contraseña para comenzar la configuración de autenticación
          de dos factores.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <FieldGroup>
          <Controller
            name="password"
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>Contraseña actual</FieldLabel>
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
        </FieldGroup>
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Spinner />}
            Continuar
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};
