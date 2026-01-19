import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface ResetPasswordEmailProps {
  resetUrl: string;
}

export const ResetPasswordEmail = ({ resetUrl }: ResetPasswordEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Restablece tu contraseña - PanaBarbero</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Heading className="text-balance text-center text-2xl">
              Restablece tu contraseña
            </Heading>

            <Container>
              <Text className="text-pretty text-sm">
                Haz clic en el siguiente botón para restablecer tu contraseña:
              </Text>

              <Section className="flex w-full items-center justify-center py-4">
                <Button
                  href={resetUrl}
                  className="mx-auto rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground text-sm"
                >
                  Restablecer contraseña
                </Button>
              </Section>

              <Text className="text-pretty text-muted-foreground text-xs">
                Si el botón no funciona, copia y pega este enlace en tu
                navegador:
              </Text>
              <Text className="break-all text-primary text-xs">
                <Link href={resetUrl}>{resetUrl}</Link>
              </Text>

              <Text className="mt-4 text-pretty text-muted-foreground text-xs">
                Este enlace expirará en 1 hora por seguridad. Si no solicitaste
                restablecer tu contraseña, ignora este correo. Tu contraseña
                actual permanecerá sin cambios.
              </Text>

              <Text className="mt-2 text-pretty font-medium text-muted-foreground text-xs">
                Por tu seguridad, nunca compartas este enlace con nadie.
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ResetPasswordEmail;
