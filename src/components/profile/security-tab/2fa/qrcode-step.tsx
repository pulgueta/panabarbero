import type { FC } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QrCodeStepProps {
  qrCodeUrl: string;
  onNext: () => void;
  onCancel: () => void;
}

export const QrCodeStep: FC<QrCodeStepProps> = ({
  qrCodeUrl,
  onNext,
  onCancel,
}) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Escanea el código QR</DialogTitle>
        <DialogDescription>
          Usa una aplicación de autenticación como Google Authenticator o Authy
          para escanear este código.
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
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onNext}>Ya escaneé el código</Button>
      </DialogFooter>
    </>
  );
};
