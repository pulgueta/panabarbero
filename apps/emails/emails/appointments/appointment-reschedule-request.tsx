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

export interface AppointmentRescheduleRequestEmailProps {
  requesterName?: string;
  requestUrl: string;
  subject: string;
  sendTo: "barber" | "customer";
}

export const AppointmentRescheduleRequestEmail = ({
  requestUrl,
  subject = "Solicitud de reagendamiento",
  sendTo,
}: AppointmentRescheduleRequestEmailProps) => {
  const intro = `${
    sendTo === "barber" ? "Un cliente" : "Tu barbero"
  } ha solicitado reagendar una cita.`;

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
                {intro}
              </Text>

              <Text className="m-0 mb-[8px] text-gray-700 text-sm">
                Ingresa al siguiente enlace para revisar y responder la
                solicitud.
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
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentRescheduleRequestEmail;
