import type { FC, ReactElement } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
    <AlertDialog>
      <AlertDialogTrigger nativeButton={false} render={trigger} />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel nativeButton={false} render={cancelLabel} />
          <AlertDialogAction nativeButton={false} render={confirmLabel} />
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
