import { api } from "@panabarbero/backend/convex/_generated/api";
import { useConvexConnectionState, useQuery } from "convex/react";
import { Button, Card, Chip, Typography } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/brand-wordmark";
import { type Access, useAccess } from "@/hooks/use-access";
import { useAuth } from "@/providers/auth-provider";

type Membership = NonNullable<Access["membership"]>;

/** Highest role wins: owner > staff > barber. */
function roleLabel(membership: Membership) {
  if (membership.isOwner) return "Dueño";
  if (membership.isStaff) return "Recepción";
  return "Barbero";
}

export default function HomeScreen() {
  const { user: sessionUser, signOut } = useAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const membership = useAccess()?.membership;
  const { isWebSocketConnected } = useConvexConnectionState();
  const insets = useSafeAreaInsets();

  const email = currentUser?.email ?? sessionUser?.email;
  const name = currentUser?.name ?? email ?? "Cargando…";

  return (
    <View
      className="flex-1 justify-center gap-8 bg-background px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <BrandWordmark />

      <View className="gap-3">
        {membership ? (
          <View className="flex-row items-center gap-2">
            <Typography weight="semibold">
              {membership.barbershopName}
            </Typography>
            <Chip size="sm" variant="soft">
              {roleLabel(membership)}
            </Chip>
          </View>
        ) : null}

        <Card>
          <Card.Body>
            <Card.Title>{name}</Card.Title>
            {email && email !== name ? (
              <Card.Description>{email}</Card.Description>
            ) : null}
          </Card.Body>
        </Card>

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
      </View>

      <Button variant="secondary" onPress={signOut}>
        Cerrar sesión
      </Button>
    </View>
  );
}
