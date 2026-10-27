import { Typography } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ScreenHeaderProps = {
  title: string;
  action?: ReactNode;
};

/** Title bar for tab screens, which hide the navigator header. */
export function ScreenHeader({ title, action }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between bg-background px-5 pb-3"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Typography weight="semibold" className="text-xl">
        {title}
      </Typography>
      {action}
    </View>
  );
}
