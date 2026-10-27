import { Typography, useThemeColor } from "heroui-native";
import { ScissorsIcon } from "phosphor-react-native";
import { View } from "react-native";

export function BrandWordmark() {
  const accent = useThemeColor("accent");

  return (
    <View className="flex-row items-center gap-2">
      <ScissorsIcon size={28} color={accent} />
      <Typography.Heading type="h2" weight="bold">
        PanaBarbero
      </Typography.Heading>
    </View>
  );
}
