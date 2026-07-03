import {
    Body,
    Button,
    Container,
    Head,
    Html,
    pixelBasedPreset,
    Preview,
    Section,
    Tailwind,
    Text,
} from "react-email";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface LowStockEmailProps {
  subject: string;
  itemName: string;
  remaining: number;
  unitLabel: string;
  reorderPoint: number;
  barbershopName: string;
}

export const LowStockEmail = ({
  subject = "Inventario bajo",
  itemName,
  remaining,
  unitLabel,
  reorderPoint,
  barbershopName,
}: LowStockEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{subject} - PanaBarbero</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Text className="mb-4 text-pretty">
              «{itemName}» está por agotarse en {barbershopName}: quedan{" "}
              {remaining} {unitLabel} y el punto de pedido es {reorderPoint}.
              Programa un reabastecimiento para no quedarte sin stock.
            </Text>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Button
                href="https://www.panabarbero.com/profile/barbershops/inventory"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Ver inventario
              </Button>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default LowStockEmail;
