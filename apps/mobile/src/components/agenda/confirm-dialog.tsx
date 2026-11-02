import { Button, type ButtonVariant, Dialog } from "heroui-native";
import { View } from "react-native";

type ConfirmDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Label of the dismiss button. */
  backLabel?: string;
  confirmLabel: string;
  confirmVariant?: ButtonVariant;
  isPending?: boolean;
  onConfirm: () => void;
};

/** Same dialog as the appointment actions, with a configurable back label. */
export function ConfirmDialog({
  isOpen,
  onOpenChange,
  title,
  description,
  backLabel = "Volver",
  confirmLabel,
  confirmVariant = "primary",
  isPending = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content>
          <View className="mb-5 gap-1.5">
            <Dialog.Title>{title}</Dialog.Title>
            {description ? (
              <Dialog.Description>{description}</Dialog.Description>
            ) : null}
          </View>
          <View className="flex-row justify-end gap-3">
            <Button
              variant="ghost"
              size="sm"
              onPress={() => onOpenChange(false)}
            >
              {backLabel}
            </Button>
            <Button
              variant={confirmVariant}
              size="sm"
              isDisabled={isPending}
              onPress={onConfirm}
            >
              {confirmLabel}
            </Button>
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
