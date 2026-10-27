import { Typography } from "heroui-native";
import type { ReactNode } from "react";
import { View } from "react-native";

type ProfileSectionProps = {
  title: string;
  children: ReactNode;
};

/** Titled group of settings on the profile screen. */
export function ProfileSection({ title, children }: ProfileSectionProps) {
  return (
    <View className="gap-3">
      <Typography weight="semibold" className="text-lg">
        {title}
      </Typography>
      {children}
    </View>
  );
}
