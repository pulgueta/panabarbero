import { Tabs } from "heroui-native";

import type { ThemePreference } from "@/providers/theme-provider";

const OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Sistema" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
];

type AppearancePickerProps = {
  value: ThemePreference;
  onChange: (value: ThemePreference) => void;
};

/** Segmented control for the app theme. */
export function AppearancePicker({ value, onChange }: AppearancePickerProps) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => onChange(next as ThemePreference)}
    >
      <Tabs.List>
        <Tabs.Indicator />
        {OPTIONS.map((option) => (
          <Tabs.Trigger
            key={option.value}
            value={option.value}
            className="flex-1"
          >
            <Tabs.Label>{option.label}</Tabs.Label>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  );
}
