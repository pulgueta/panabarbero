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
} from "@react-email/components";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface AppointmentRescheduleByCustomerEmailProps {
  requestUrl: string;
  customerName: string;
  subject: string;
}

export const AppointmentRescheduleByCustomerEmail = ({
  requestUrl,
  customerName = "Cliente",
  subject = "Reagendamiento de cita",
}: AppointmentRescheduleByCustomerEmailProps) => {
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
              <Text className="m-0 mb-[8px] text-gray-700 text-sm">
                {customerName} ha solicitado reagendar su cita. Haz clic en el
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

export default AppointmentRescheduleByCustomerEmail;
