import { ControlField, Description, Label } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

type PreferenceSwitchRowProps = {
  label: string;
  description?: string;
  isSelected: boolean;
  onSelectedChange: (isSelected: boolean) => void;
  isDisabled?: boolean;
  /** Extra muted content below the description. */
  children?: ReactNode;
};

export function PreferenceSwitchRow({
  label,
  description,
  isSelected,
  onSelectedChange,
  isDisabled,
  children,
}: PreferenceSwitchRowProps) {
  return (
    // 52 pt list row; the switch stays HeroUI's own control.
    <View className="min-h-[52px] justify-center px-4 py-2">
      <ControlField
        isSelected={isSelected}
        onSelectedChange={onSelectedChange}
        isDisabled={isDisabled}
      >
        <View className="flex-1 gap-0.5">
          <Label>{label}</Label>
          {description ? <Description>{description}</Description> : null}
          {children}
        </View>
        <ControlField.Indicator />
      </ControlField>
    </View>
  );
}
