import type { FC, ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ConfirmationDialogProps {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: ReactElement;
  cancelLabel?: ReactElement;
}

export const ConfirmationDialog: FC<ConfirmationDialogProps> = ({
  trigger,
  title,
  description,
  confirmLabel,
  cancelLabel,
}) => {
  return (
    <Dialog>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" render={confirmLabel} />
          {cancelLabel && <Button variant="outline" render={cancelLabel} />}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
