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
  );
}
