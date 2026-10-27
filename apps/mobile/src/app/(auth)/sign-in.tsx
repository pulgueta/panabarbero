import { Button, FieldError, Typography } from "heroui-native";
import { useState } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandWordmark } from "@/components/brand-wordmark";
import { useAuth } from "@/providers/auth-provider";

export default function SignInScreen() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleSignIn = async () => {
    setIsPending(true);
    setHasError(false);
    try {
      await signIn();
    } catch {
      setHasError(true);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <View
      className="flex-1 justify-center gap-8 bg-background px-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="gap-3">
        <BrandWordmark />
        <Typography className="text-muted">
          La app para equipos de barbería.
        </Typography>
      </View>

      <View className="gap-3">
        <Button onPress={handleSignIn} isDisabled={isPending}>
          Iniciar sesión
        </Button>
        <FieldError isInvalid={hasError}>
          No pudimos iniciar sesión. Intenta de nuevo.
        </FieldError>
      </View>
    </View>
  );
}
