import { useConvexConnectionState } from "convex/react";
import { Button, Card, Chip, Typography, useThemeColor } from "heroui-native";
import { ScissorsIcon } from "phosphor-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const { isWebSocketConnected } = useConvexConnectionState();
  const accent = useThemeColor("accent");
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 justify-center gap-8 bg-background px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center gap-2">
        <ScissorsIcon size={28} color={accent} />
        <Typography.Heading type="h2" weight="bold">
          PanaBarbero
        </Typography.Heading>
      </View>

      <Card>
        <Card.Body className="flex-row items-center justify-between">
          <Card.Title>Conexión</Card.Title>
          <Chip
            size="sm"
            variant="soft"
            color={isWebSocketConnected ? "success" : "default"}
          >
            {isWebSocketConnected ? "Conectado" : "Conectando…"}
          </Chip>
        </Card.Body>
      </Card>

      <Button>Continuar</Button>
    </View>
  );
}
