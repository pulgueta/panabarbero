import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { twoFactor } from "@/lib/auth-client";
import { twoFactorVerifySchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";
import { zodResolver } from "@hookform/resolvers/zod";
import type { FC } from "react";
import { startTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

interface VerifyStepProps {
  onSuccess: () => void;
  onBack: () => void;
}

export const VerifyStep: FC<VerifyStepProps> = ({ onSuccess, onBack }) => {
  const form = useForm({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: {
      code: "",
      trustDevice: true,
    },
  });

  const handleSubmit = form.handleSubmit(async ({ code, trustDevice }) => {
    try {
      const { data, error } = await twoFactor.verifyTotp({
        code,
        trustDevice,
      });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      if (data) {
        toast.success("2FA activado correctamente");
        startTransition(() => {
          onSuccess();
        });
        return;
      }
    } catch (error) {
      toast.error("Error al verificar el código. Inténtalo de nuevo.");
      console.error(error);
    }
  });

  return (
    <>
      <DialogHeader>
        <DialogTitle>Verificar código</DialogTitle>
        <DialogDescription>
          Ingresa el código de 6 dígitos que aparece en tu aplicación de
          autenticación.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit}>
        <FieldGroup className="space-y-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid} className="w-full">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={form.formState.isSubmitting}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  {fieldState.invalid && (
                    <div className="mt-2 text-center">
                      <FieldError errors={[fieldState.error]} />
                    </div>
                  )}
                </Field>
              )}
            />
            <Controller
              name="trustDevice"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <Checkbox
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldLabel htmlFor={field.name} className="text-sm">
                    Confiar en este dispositivo
                  </FieldLabel>
                </Field>
              )}
            />
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onBack}>
            Atrás
          </Button>
          <Button
            type="submit"
            disabled={
              form.formState.isSubmitting || form.watch("code").length !== 6
            }
          >
            {form.formState.isSubmitting && <Spinner />}
            Verificar
          </Button>
        </DialogFooter>
      </form>
    </>
  );
};
