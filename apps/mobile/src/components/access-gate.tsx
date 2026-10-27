import { Button, Typography, useThemeColor } from "heroui-native";
import {
  type Icon,
  StorefrontIcon,
  WifiSlashIcon,
} from "phosphor-react-native";
import type { ReactNode } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/brand-wordmark";
import type { Access } from "@/hooks/use-access";
import { useAuth } from "@/providers/auth-provider";

type AccessGateProps = {
  access: Access;
  onRecheck: () => void;
};

/**
 * Shown to signed-in users who cannot enter the app. It only states the fact:
 * no price, purchase action, or external link (App Store 3.1.1 / 3.1.3).
 */
export function AccessGate({ access, onRecheck }: AccessGateProps) {
  const { user, signOut } = useAuth();

  const email = access.profile?.email ?? user?.email;
  const copy = access.membership
    ? {
        title: `El plan de ${access.membership.barbershopName} no está activo`,
        body: "Para usar la app, la barbería necesita un plan activo de PanaBarbero. El dueño gestiona el plan desde su cuenta.",
      }
    : {
        title: "Esta app es para equipos de barbería",
        body: "Tu cuenta no pertenece a ninguna barbería en PanaBarbero. Si trabajas en una, pide al dueño que te invite desde su cuenta.",
      };

  return (
    <GateScreen
      icon={StorefrontIcon}
      title={copy.title}
      body={copy.body}
      note={email ? `Sesión iniciada como ${email}` : undefined}
      actions={
        <>
          <Button variant="secondary" onPress={onRecheck}>
            Volver a comprobar
          </Button>
          <Button variant="ghost" onPress={signOut}>
            Cerrar sesión
          </Button>
        </>
      }
    />
  );
}

/**
 * Shown when the user is signed in but Convex has no session, for example
 * after an offline start or a failed token refresh.
 */
export function SessionProblem() {
  const { signOut, retryConvexAuth } = useAuth();

  return (
    <GateScreen
      icon={WifiSlashIcon}
      title="No pudimos conectar tu sesión"
      body="Revisa tu conexión e intenta de nuevo. Si el problema sigue, cierra sesión y vuelve a entrar."
      actions={
        <>
          <Button variant="primary" onPress={retryConvexAuth}>
            Reintentar
          </Button>
          <Button variant="ghost" onPress={signOut}>
            Cerrar sesión
          </Button>
        </>
      }
    />
  );
}

type GateScreenProps = {
  icon: Icon;
  title: string;
  body: string;
  note?: string;
  actions: ReactNode;
};

function GateScreen({
  icon: IconComponent,
  title,
  body,
  note,
  actions,
}: GateScreenProps) {
  const insets = useSafeAreaInsets();
  const muted = useThemeColor("muted");

  return (
    <View
      className="flex-1 justify-between bg-background px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <BrandWordmark />

      <View className="gap-4">
        <IconComponent size={40} color={muted} />
        <Typography.Heading type="h3">{title}</Typography.Heading>
        <Typography.Paragraph color="muted">{body}</Typography.Paragraph>
        {note ? (
          <Typography.Paragraph type="body-sm" color="muted">
            {note}
          </Typography.Paragraph>
        ) : null}
      </View>

      <View className="gap-3">{actions}</View>
    </View>
  );
}
