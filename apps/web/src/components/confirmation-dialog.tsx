import type { FC, ReactElement } from "react";

import { Button } from "@/components/ui/button";
import {
  ResponsiveModal,
  ResponsiveModalContent,
  ResponsiveModalDescription,
  ResponsiveModalFooter,
  ResponsiveModalHeader,
  ResponsiveModalTitle,
  ResponsiveModalTrigger,
} from "@/components/ui/responsive-modal";

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
    <ResponsiveModal>
      <ResponsiveModalTrigger render={trigger} />
      <ResponsiveModalContent>
        <ResponsiveModalHeader>
          <ResponsiveModalTitle>{title}</ResponsiveModalTitle>
          <ResponsiveModalDescription>{description}</ResponsiveModalDescription>
        </ResponsiveModalHeader>
        <ResponsiveModalFooter>
          <Button variant="destructive" render={confirmLabel} />
          {cancelLabel && <Button variant="outline" render={cancelLabel} />}
        </ResponsiveModalFooter>
      </ResponsiveModalContent>
    </ResponsiveModal>
  );
};
