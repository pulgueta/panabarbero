import { api } from "@panabarbero/backend/convex/_generated/api";
import { useConvexConnectionState, useQuery } from "convex/react";
import { Button, Card, Chip, Typography } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/brand-wordmark";
import { type Access, useAccess } from "@/hooks/use-access";
import { type PushStatus, usePushStatus } from "@/hooks/use-push-registration";
import { useAuth } from "@/providers/auth-provider";

type Membership = NonNullable<Access["membership"]>;

/** Highest role wins: owner > staff > barber. */
function roleLabel(membership: Membership) {
  if (membership.isOwner) return "Dueño";
  if (membership.isStaff) return "Recepción";
  return "Barbero";
}

/** QA hint for push setup; `null` while registration runs. */
const pushStatusLabel: Record<PushStatus, string | null> = {
  pending: null,
  active: "Notificaciones push: activas",
  simulator: "Notificaciones push: no disponibles en este dispositivo",
  denied: "Notificaciones push: permiso denegado",
  "no-project-id": "Notificaciones push: pendientes de configuración",
  error: "Notificaciones push: no se pudieron activar",
};

export default function HomeScreen() {
  const { user: sessionUser, signOut } = useAuth();
  const currentUser = useQuery(api.auth.getCurrentUser);
  const membership = useAccess()?.membership;
  const { isWebSocketConnected } = useConvexConnectionState();
  const insets = useSafeAreaInsets();
  const pushLabel = pushStatusLabel[usePushStatus()];

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
        {pushLabel ? (
          <Typography.Paragraph type="body-sm" color="muted">
            {pushLabel}
          </Typography.Paragraph>
        ) : null}

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
