import {
    Body,
    Button,
    Container,
    Head,
    Heading,
    Html,
    pixelBasedPreset,
    Preview,
    Section,
    Tailwind,
    Text,
} from "@react-email/components";

import { tailwindConfig } from "../tailwind-config";
import { Header } from "./components/header";

// biome-ignore lint/complexity/noBannedTypes: possible to extend in the future
export type WelcomeEmailProps = {};

export const WelcomeEmail = (_: WelcomeEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Bienvenido a PanaBarbero</Preview>
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
              ¡Bienvenido a PanaBarbero!
            </Heading>

            <Container>
              <Text className="text-pretty text-sm">
                A partir de ahora, podrás agendar y gestionar citas con tus
                barberos o crear tu propia barbería y gestionar tus citas y
                clientes.
              </Text>

              <Section className="flex w-full items-center justify-center">
                <Button
                  href="https://www.panabarbero.com/barbershops"
                  className="mx-auto rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
                >
                  Descubrir barberías
                </Button>
              </Section>
            </Container>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default WelcomeEmail;
