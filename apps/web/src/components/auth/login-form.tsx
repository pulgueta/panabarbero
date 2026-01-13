/** biome-ignore-all lint/correctness/noChildrenProp: Enforced by TanStack Form */

import { zodResolver } from "@hookform/resolvers/zod";
import { signIn, twoFactor } from "@panabarbero/convex/auth";
import { Link, useRouter } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, ShieldCheckIcon } from "lucide-react";
import { useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Spinner } from "@/components/ui/spinner";
import { loginFormSchema } from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

export const LoginForm = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [show2FADialog, setShow2FADialog] = useState<boolean>(false);
  const [totpCode, setTotpCode] = useState<string>("");
  const [isVerifying2FA, setIsVerifying2FA] = useState<boolean>(false);
  const [trustDevice, setTrustDevice] = useState<boolean>(true);

  const trustDeviceId = useId();

  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: true,
    },
    resolver: zodResolver(loginFormSchema),
  });

  const handleSuccessfulLogin = () => {
    router.navigate({
      to: "/profile",
      search: { tab: "account" },
      replace: true,
    });
  };

  const handle2FAVerification = async () => {
    if (totpCode.length !== 6) {
      toast.error("Ingresa un código de 6 dígitos");
      return;
    }

    setIsVerifying2FA(true);
    try {
      const { data, error } = await twoFactor.verifyTotp({
        code: totpCode,
        trustDevice,
      });

      if (data) {
        toast.success("Verificación exitosa");
        setShow2FADialog(false);
        handleSuccessfulLogin();
      }

      if (error?.code) {
        toast.error(translateBetterAuthError(error.code));
      }
    } catch (error) {
      toast.error("Error al verificar el código");
      console.error(error);
    } finally {
      setIsVerifying2FA(false);
    }
  };

  const onSubmit = form.handleSubmit(
    async ({ email, password, rememberMe }) => {
      try {
        const response = await signIn.email({
          email,
          password,
          rememberMe,
        });

        // Check if 2FA is required
        if ("twoFactorRedirect" in response) {
          // 2FA is required, show the 2FA dialog
          setTotpCode("");
          setShow2FADialog(true);
          return;
        }

        if (response.error) {
          // Check for specific 2FA-related errors
          if (response.error.code === "TWO_FACTOR_NOT_ENABLED") {
            // Regular login without 2FA, should proceed normally
            handleSuccessfulLogin();
            return;
          }
          toast.error(response.error.message ?? "Error al iniciar sesión");
          return;
        }

        // Successful login without 2FA
        handleSuccessfulLogin();
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
    <>
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
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
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
                <Field
                  data-invalid={fieldState.invalid}
                  orientation="horizontal"
                >
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

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting && <Spinner />}
          Iniciar sesión
        </Button>
      </form>

      {/* 2FA Verification Dialog */}
      <Dialog open={show2FADialog} onOpenChange={setShow2FADialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <ShieldCheckIcon className="size-5 text-primary" />
              <DialogTitle>Verificación de dos factores</DialogTitle>
            </div>
            <DialogDescription>
              Ingresa el código de 6 dígitos de tu aplicación de autenticación
              para continuar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <InputOTP
              maxLength={6}
              value={totpCode}
              onChange={setTotpCode}
              disabled={isVerifying2FA}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>

            <Field orientation="horizontal" className="mt-2">
              <Checkbox
                id={trustDeviceId}
                checked={trustDevice}
                onCheckedChange={(checked) => setTrustDevice(checked === true)}
                disabled={isVerifying2FA}
              />
              <FieldLabel htmlFor={trustDeviceId} className="text-sm">
                Confiar en este dispositivo por 30 días
              </FieldLabel>
            </Field>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShow2FADialog(false);
                setTotpCode("");
              }}
              disabled={isVerifying2FA}
            >
              Cancelar
            </Button>
            <Button
              onClick={handle2FAVerification}
              disabled={isVerifying2FA || totpCode.length !== 6}
            >
              {isVerifying2FA && <Spinner />}
              Verificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
