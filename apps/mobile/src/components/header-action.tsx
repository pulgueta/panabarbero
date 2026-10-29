import { Stack } from "expo-router";
import { Typography } from "heroui-native";
import type { ComponentProps } from "react";
import { Platform, Pressable } from "react-native";

type HeaderActionProps = {
  label: string;
  /** SF Symbol shown on iOS; Android shows the label. */
  icon: ComponentProps<typeof Stack.Toolbar.Button>["icon"];
  onPress: () => void;
  disabled?: boolean;
};

/**
 * One action at the right of a stack header. iOS renders a native toolbar
 * button (glass on iOS 26); Android lacks `@expo/ui`, which `Stack.Toolbar`
 * needs there, so it falls back to a `headerRight` pressable.
 */
export function HeaderAction({
  label,
  icon,
  onPress,
  disabled = false,
}: HeaderActionProps) {
  if (Platform.OS === "ios") {
    return (
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon={icon}
          accessibilityLabel={label}
          disabled={disabled}
          onPress={onPress}
        />
      </Stack.Toolbar>
    );
  }

  return (
    <Stack.Screen
      options={{
        headerRight: () => (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPress}
            hitSlop={8}
            className={disabled ? "opacity-40" : undefined}
          >
            <Typography weight="medium" className="text-link">
              {label}
            </Typography>
          </Pressable>
        ),
      }}
    />
  );
}
