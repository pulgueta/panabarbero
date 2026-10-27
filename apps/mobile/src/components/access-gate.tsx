import { Button, Typography, useThemeColor } from "heroui-native";
import { StorefrontIcon } from "phosphor-react-native";
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
  const insets = useSafeAreaInsets();
  const muted = useThemeColor("muted");

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
    <View
      className="flex-1 justify-between bg-background px-6"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <BrandWordmark />

      <View className="gap-4">
        <StorefrontIcon size={40} color={muted} />
        <Typography.Heading type="h3">{copy.title}</Typography.Heading>
        <Typography.Paragraph color="muted">{copy.body}</Typography.Paragraph>
        {email ? (
          <Typography.Paragraph type="body-sm" color="muted">
            Sesión iniciada como {email}
          </Typography.Paragraph>
        ) : null}
      </View>

      <View className="gap-3">
        <Button variant="secondary" onPress={onRecheck}>
          Volver a comprobar
        </Button>
        <Button variant="ghost" onPress={signOut}>
          Cerrar sesión
        </Button>
      </View>
    </View>
  );
}
