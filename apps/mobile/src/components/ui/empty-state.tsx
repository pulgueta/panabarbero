import { Typography } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

const titleStyle = { fontSize: 15, lineHeight: 20 };
const bodyStyle = { fontSize: 13, lineHeight: 18 };

type EmptyStateProps = {
  title: string;
  description?: string;
  /** 18 pt icon shown in a 44 pt well above the title. */
  icon?: ReactNode;
  /** One outline pill under the text. */
  action?: { label: string; onPress: () => void };
};

/**
 * Centered message for an empty area. With `icon` and `action` it is the
 * full "Default" variant: icon well, title, body, pill button.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
}: EmptyStateProps) {
  return (
    <View className="items-center p-6">
      {icon ? (
        <View className="mb-3 size-11 items-center justify-center rounded-full bg-agenda-pill">
          {icon}
        </View>
      ) : null}
      <Typography weight="medium" align="center" style={titleStyle}>
        {title}
      </Typography>
      {description ? (
        <Typography
          color="muted"
          align="center"
          className="mt-1.5 max-w-[300px]"
          style={bodyStyle}
        >
          {description}
        </Typography>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          className="mt-5 h-9 justify-center rounded-full border border-border px-4 active:bg-surface-tertiary"
        >
          <Typography weight="medium" style={bodyStyle}>
            {action.label}
          </Typography>
        </Pressable>
      ) : null}
    </View>
  );
}
