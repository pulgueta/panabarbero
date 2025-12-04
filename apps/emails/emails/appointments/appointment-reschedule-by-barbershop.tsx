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

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface AppointmentRescheduleByBarbershopEmailProps {
  barbershopName: string;
  requestUrl: string;
  customerName: string;
  subject: string;
}

export const AppointmentRescheduleByBarbershopEmail = ({
  barbershopName = "Barbería",
  requestUrl,
  customerName = "Cliente",
  subject = "Reagendamiento de cita",
}: AppointmentRescheduleByBarbershopEmailProps) => {
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
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white px-8 py-2">
            <Header />

            <Section className="my-4">
              <Heading className="m-0 mb-2 font-bold text-gray-900 text-lg">
                Estimado(a) {customerName},
              </Heading>

              <Text className="m-0 mb-[8px] text-gray-700 text-sm">
                {barbershopName} ha solicitado reagendar tu cita. Haz clic en el
                botón a continuación para ver la solicitud. Podrás aceptar o
                rechazar la propuesta.
              </Text>
            </Section>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Button
                href={requestUrl}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Ver solicitud
              </Button>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentRescheduleByBarbershopEmail;
