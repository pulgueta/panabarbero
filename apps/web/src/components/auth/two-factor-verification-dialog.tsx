/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { zodResolver } from "@hookform/resolvers/zod";
import { twoFactor } from "@panabarbero/convex/auth";
import { startTransition, useId } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { twoFactorFormSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

interface TwoFactorVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const TwoFactorVerificationDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: TwoFactorVerificationDialogProps) => {
  const trustDeviceId = useId();

  const form = useForm({
    resolver: zodResolver(twoFactorFormSchema),
    defaultValues: {
      code: "",
      trustDevice: true,
    },
  });

  const onSubmit = form.handleSubmit(async (formData) => {
    try {
      const { data, error } = await twoFactor.verifyTotp({
        code: formData.code,
        trustDevice: formData.trustDevice,
      });

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
        return;
      }

      if (data) {
        toast.success("Verificación exitosa");
        startTransition(() => {
          onOpenChange(false);
          form.reset();
          onSuccess();
        });
        return;
      }
    } catch (error) {
      toast.error("Error al verificar el código");
      console.error(error);
    }
  });

  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Verificación de dos factores</DialogTitle>

          <DialogDescription>
            Ingresa el código de 6 dígitos de tu aplicación de autenticación
            para continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="flex flex-col items-center gap-4 py-4">
            <Controller
              name="code"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <InputOTP
                    maxLength={6}
                    value={field.value}
                    onChange={field.onChange}
                    disabled={form.formState.isSubmitting}
                  >
                    <InputOTPGroup className="w-full justify-center">
                      {Array.from({ length: 6 }).map((_, index) => (
                        // biome-ignore lint/suspicious/noArrayIndexKey: safe
                        <InputOTPSlot key={index} index={index} />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="trustDevice"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  orientation="horizontal"
                  className="mt-2"
                >
                  <Checkbox
                    id={trustDeviceId}
                    checked={field.value}
                    onCheckedChange={(checked) =>
                      field.onChange(checked === true)
                    }
                    disabled={form.formState.isSubmitting}
                  />
                  <FieldLabel htmlFor={trustDeviceId} className="text-sm">
                    Confiar en este dispositivo por 30 días
                  </FieldLabel>
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={form.formState.isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting || !form.formState.isValid}
            >
              {form.formState.isSubmitting && <Spinner />}
              Verificar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
