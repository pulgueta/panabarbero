import { Avatar, Chip, Typography } from "heroui-native";
import { View } from "react-native";

type ProfileIdentityProps = {
  name: string;
  email?: string;
  image?: string | null;
  shopName?: string;
  roleLabel?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return letters
    .map((part) => part?.[0] ?? "")
    .join("")
    .toUpperCase();
}

export function ProfileIdentity({
  name,
  email,
  image,
  shopName,
  roleLabel,
}: ProfileIdentityProps) {
  return (
    <View className="flex-row items-center gap-4">
      <Avatar size="lg" color="default" alt={name}>
        {image ? <Avatar.Image source={{ uri: image }} /> : null}
        <Avatar.Fallback>{initials(name)}</Avatar.Fallback>
      </Avatar>

      <View className="flex-1 gap-1">
        <Typography weight="semibold" className="text-lg" numberOfLines={1}>
          {name}
        </Typography>
        {email && email !== name ? (
          <Typography type="body-sm" color="muted" numberOfLines={1}>
            {email}
          </Typography>
        ) : null}
        {shopName ? (
          <View className="flex-row items-center gap-2">
            <Typography type="body-sm" numberOfLines={1} className="shrink">
              {shopName}
            </Typography>
            {roleLabel ? (
              <Chip size="sm" variant="soft" color="default">
                {roleLabel}
              </Chip>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
