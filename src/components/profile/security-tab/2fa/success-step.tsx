import { CheckCircle2Icon, Info } from "lucide-react";
import type { FC } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface SuccessStepProps {
  backupCodes: string[];
  onClose: () => void;
}

export const SuccessStep: FC<SuccessStepProps> = ({ backupCodes, onClose }) => {
  return (
    <>
      <DialogHeader>
        <DialogTitle>2FA Activado</DialogTitle>
        <DialogDescription>
          Tu cuenta ahora está protegida con autenticación de dos factores.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col items-center gap-4 py-4">
        <CheckCircle2Icon className="size-8 text-green-600 dark:text-green-400" />

        <p className="text-center text-muted-foreground text-sm">
          A partir de ahora, necesitarás ingresar un código de tu aplicación de
          autenticación cada vez que inicies sesión.
        </p>

        {backupCodes.length > 0 && (
          <>
            <Alert variant="info">
              <Info />
              <AlertTitle>Atención</AlertTitle>
              <AlertDescription>
                Asegúrate de guardar estos códigos en un lugar seguro. Los
                necesitarás si pierdes acceso a tu aplicación de autenticación.
              </AlertDescription>
            </Alert>

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
          </>
        )}
      </div>
      <DialogFooter>
        <Button onClick={onClose}>Listo</Button>
      </DialogFooter>
    </>
  );
};
