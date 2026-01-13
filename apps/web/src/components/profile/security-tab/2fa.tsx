import { zodResolver } from "@hookform/resolvers/zod";
import { twoFactor, useSession } from "@panabarbero/convex/auth";
import { CheckCircle2Icon, ShieldIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
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
import {
  disableTwoFactorSchema,
  twoFactorPasswordSchema,
  twoFactorVerifySchema,
} from "@/lib/auth-schemas";
import { translateBetterAuthError } from "@/lib/better-auth-errors";

type SetupStep = "idle" | "password" | "qrcode" | "verify" | "success";

export const TwoFactorSection: FC = () => {
  const { data: session } = useSession();
  const isTwoFactorEnabled = session?.user?.twoFactorEnabled ?? false;

  const [step, setStep] = useState<SetupStep>("idle");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Password form (for enabling 2FA)
  const passwordForm = useForm({
    resolver: zodResolver(twoFactorPasswordSchema),
    defaultValues: {
      password: "",
    },
  });

  // Verification form
  const verifyForm = useForm({
    resolver: zodResolver(twoFactorVerifySchema),
    defaultValues: {
      code: "",
      trustDevice: true,
    },
  });

  // Disable 2FA form
  const disableForm = useForm({
    resolver: zodResolver(disableTwoFactorSchema),
    defaultValues: {
      password: "",
    },
  });

  const handleStartSetup = () => {
    setStep("password");
    passwordForm.reset();
    verifyForm.reset();
    setTotpUri(null);
    setBackupCodes([]);
  };

  const handleEnableTwoFactor = passwordForm.handleSubmit(
    async ({ password }) => {
      try {
        const { data, error } = await twoFactor.enable({ password });

        if (data?.totpURI) {
          setTotpUri(data.totpURI);
          setBackupCodes(data.backupCodes ?? []);
          setStep("qrcode");
        }

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
        }
      } catch (error) {
        toast.error("Error al activar 2FA. Verifica tu contraseña.");
        console.error(error);
      }
    },
  );

  const handleVerifyCode = verifyForm.handleSubmit(
    async ({ code, trustDevice }) => {
      try {
        const { data, error } = await twoFactor.verifyTotp({
          code,
          trustDevice,
        });

        if (data) {
          setStep("success");
          toast.success("2FA activado correctamente");
        }

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
        }
      } catch (error) {
        toast.error("Error al verificar el código. Inténtalo de nuevo.");
        console.error(error);
      }
    },
  );

  const handleDisableTwoFactor = disableForm.handleSubmit(
    async ({ password }) => {
      try {
        const { data, error } = await twoFactor.disable({ password });

        if (data) {
          toast.success("2FA desactivado correctamente");
          setShowDisableDialog(false);
          disableForm.reset();
        }

        if (error?.code) {
          toast.error(translateBetterAuthError(error.code));
        }
      } catch (error) {
        toast.error("Error al desactivar 2FA. Verifica tu contraseña.");
        console.error(error);
      }
    },
  );

  const handleCloseSetup = () => {
    setStep("idle");
    passwordForm.reset();
    verifyForm.reset();
    setTotpUri(null);
    setBackupCodes([]);
  };

  const qrCodeUrl = totpUri
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(totpUri)}`
    : null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Autenticación de dos factores (2FA)</CardTitle>
          <CardDescription>
            {isTwoFactorEnabled
              ? "Tu cuenta está protegida con autenticación de dos factores."
              : "Activa la autenticación de dos factores para mejorar la seguridad de tu cuenta."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isTwoFactorEnabled ? (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/30">
              <CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />
              <div>
                <p className="font-medium text-green-800 dark:text-green-200">
                  2FA Activado
                </p>
                <p className="text-green-600 text-sm dark:text-green-400">
                  Tu cuenta está protegida con autenticación de dos factores.
                </p>
              </div>
            </div>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ShieldIcon />
                </EmptyMedia>
              </EmptyHeader>
              <EmptyTitle>No has activado el 2FA</EmptyTitle>
              <EmptyDescription>
                Protege tu cuenta agregando una capa adicional de seguridad.
              </EmptyDescription>
            </Empty>
          )}
        </CardContent>
        <CardFooter className="justify-end pt-0">
          {isTwoFactorEnabled ? (
            <Button
              variant="destructive"
              onClick={() => setShowDisableDialog(true)}
            >
              Desactivar 2FA
            </Button>
          ) : (
            <Button onClick={handleStartSetup}>Activar 2FA</Button>
          )}
        </CardFooter>
      </Card>

      {/* Setup Dialog */}
      <Dialog open={step !== "idle"} onOpenChange={() => handleCloseSetup()}>
        <DialogContent>
          {step === "password" && (
            <>
              <DialogHeader>
                <DialogTitle>Activar 2FA</DialogTitle>
                <DialogDescription>
                  Ingresa tu contraseña para comenzar la configuración de
                  autenticación de dos factores.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEnableTwoFactor}>
                <FieldGroup>
                  <Controller
                    name="password"
                    control={passwordForm.control}
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
                          disabled={passwordForm.formState.isSubmitting}
                        />
                        {fieldState.invalid && (
                          <FieldError errors={[fieldState.error]} />
                        )}
                      </Field>
                    )}
                  />
                </FieldGroup>
                <DialogFooter className="mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCloseSetup}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={passwordForm.formState.isSubmitting}
                  >
                    {passwordForm.formState.isSubmitting && <Spinner />}
                    Continuar
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {step === "qrcode" && qrCodeUrl && (
            <>
              <DialogHeader>
                <DialogTitle>Escanea el código QR</DialogTitle>
                <DialogDescription>
                  Usa una aplicación de autenticación como Google Authenticator
                  o Authy para escanear este código.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="rounded-lg border bg-white p-4">
                  <img
                    src={qrCodeUrl}
                    alt="Código QR para 2FA"
                    width={200}
                    height={200}
                  />
                </div>
                <p className="text-center text-muted-foreground text-sm">
                  Si no puedes escanear el código, también puedes ingresar el
                  código manualmente en tu aplicación.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={handleCloseSetup}>
                  Cancelar
                </Button>
                <Button onClick={() => setStep("verify")}>
                  Ya escaneé el código
                </Button>
              </DialogFooter>
            </>
          )}

          {step === "verify" && (
            <>
              <DialogHeader>
                <DialogTitle>Verificar código</DialogTitle>
                <DialogDescription>
                  Ingresa el código de 6 dígitos que aparece en tu aplicación de
                  autenticación.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleVerifyCode}>
                <FieldGroup className="space-y-4 py-4">
                  <div className="flex flex-col items-center gap-4">
                    <Controller
                      name="code"
                      control={verifyForm.control}
                      render={({ field, fieldState }) => (
                        <Field
                          data-invalid={fieldState.invalid}
                          className="w-full"
                        >
                          <div className="flex justify-center">
                            <InputOTP
                              maxLength={6}
                              value={field.value}
                              onChange={field.onChange}
                              disabled={verifyForm.formState.isSubmitting}
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
                      control={verifyForm.control}
                      render={({ field }) => (
                        <Field orientation="horizontal">
                          <Checkbox
                            id={field.name}
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={verifyForm.formState.isSubmitting}
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
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("qrcode")}
                  >
                    Atrás
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      verifyForm.formState.isSubmitting ||
                      verifyForm.watch("code").length !== 6
                    }
                  >
                    {verifyForm.formState.isSubmitting && <Spinner />}
                    Verificar
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}

          {step === "success" && (
            <>
              <DialogHeader>
                <DialogTitle>¡2FA Activado!</DialogTitle>
                <DialogDescription>
                  Tu cuenta ahora está protegida con autenticación de dos
                  factores.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="rounded-full bg-green-50 p-4 dark:bg-green-950/30">
                  <CheckCircle2Icon className="size-12 text-green-600 dark:text-green-400" />
                </div>
                <p className="text-center text-muted-foreground text-sm">
                  A partir de ahora, necesitarás ingresar un código de tu
                  aplicación de autenticación cada vez que inicies sesión.
                </p>
                {backupCodes.length > 0 && (
                  <div className="w-full rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-950/30">
                    <p className="mb-2 font-medium text-yellow-800 dark:text-yellow-200">
                      Códigos de respaldo
                    </p>
                    <p className="mb-2 text-sm text-yellow-600 dark:text-yellow-400">
                      Guarda estos códigos en un lugar seguro. Los necesitarás
                      si pierdes acceso a tu aplicación de autenticación.
                    </p>
                    <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                      {backupCodes.map((code) => (
                        <div
                          key={code}
                          className="rounded bg-white p-2 text-center dark:bg-black/20"
                        >
                          {code}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={handleCloseSetup}>Listo</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Desactivar 2FA</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que quieres desactivar la autenticación de dos
              factores? Tu cuenta será menos segura.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDisableTwoFactor}>
            <FieldGroup className="space-y-4 py-4">
              <Controller
                name="password"
                control={disableForm.control}
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
                      disabled={disableForm.formState.isSubmitting}
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDisableDialog(false);
                  disableForm.reset();
                }}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={disableForm.formState.isSubmitting}
              >
                {disableForm.formState.isSubmitting && <Spinner />}
                Desactivar 2FA
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};
