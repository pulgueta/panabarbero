import { Typography } from "heroui-native";
import { View } from "react-native";

const titleStyle = { fontSize: 15, lineHeight: 20 };
const bodyStyle = { fontSize: 13, lineHeight: 18 };

type EmptyStateProps = {
  title: string;
  description?: string;
};

/** Centered title and optional one-line explanation for an empty area. */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View className="items-center gap-1.5 p-6">
      <Typography weight="medium" align="center" style={titleStyle}>
        {title}
      </Typography>
      {description ? (
        <Typography color="muted" align="center" style={bodyStyle}>
          {description}
        </Typography>
      ) : null}
    </View>
  );
}
