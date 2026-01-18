import { useSession } from "@panabarbero/convex/auth";
import { CheckCircle2Icon, ShieldIcon } from "lucide-react";
import type { FC } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DisableDialog } from "./disable-dialog";
import { PasswordStep } from "./password-step";
import { QrCodeStep } from "./qrcode-step";
import { SuccessStep } from "./success-step";
import { VerifyStep } from "./verify-step";

type SetupStep = "idle" | "password" | "qrcode" | "verify" | "success";

export const TwoFactorSection: FC = () => {
  const { data: session } = useSession();
  const isTwoFactorEnabled = session?.user?.twoFactorEnabled ?? false;

  const [step, setStep] = useState<SetupStep>("idle");
  const [totpUri, setTotpUri] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  const handleStartSetup = () => {
    setStep("password");
    setTotpUri(null);
    setBackupCodes([]);
  };

  const handlePasswordSuccess = (uri: string, codes: string[]) => {
    setTotpUri(uri);
    setBackupCodes(codes);
    setStep("qrcode");
  };

  const handleQrCodeNext = () => {
    setStep("verify");
  };

  const handleVerifySuccess = () => {
    setStep("success");
  };

  const handleCloseSetup = () => {
    setStep("idle");
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
            Gestion la autenticación de dos factores para mejorar la seguridad
            de tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {isTwoFactorEnabled ? (
                  <CheckCircle2Icon className="text-green-600" />
                ) : (
                  <ShieldIcon />
                )}
              </EmptyMedia>
            </EmptyHeader>
            <EmptyTitle>
              2FA {isTwoFactorEnabled ? "Activado" : "Desactivado"}
            </EmptyTitle>
            <EmptyDescription>
              {isTwoFactorEnabled
                ? "Tu cuenta está protegida con autenticación de dos factores."
                : "Protege tu cuenta agregando una capa adicional de seguridad."}
            </EmptyDescription>
          </Empty>
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
            <PasswordStep
              onNext={handlePasswordSuccess}
              onCancel={handleCloseSetup}
            />
          )}

          {step === "qrcode" && qrCodeUrl && (
            <QrCodeStep
              qrCodeUrl={qrCodeUrl}
              onNext={handleQrCodeNext}
              onCancel={handleCloseSetup}
            />
          )}

          {step === "verify" && (
            <VerifyStep
              onSuccess={handleVerifySuccess}
              onBack={() => setStep("qrcode")}
            />
          )}

          {step === "success" && (
            <SuccessStep backupCodes={backupCodes} onClose={handleCloseSetup} />
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <DisableDialog
        open={showDisableDialog}
        onOpenChange={setShowDisableDialog}
      />
    </>
  );
};
