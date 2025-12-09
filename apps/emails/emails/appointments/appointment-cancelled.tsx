import {
  Body,
  Container,
  Head,
  Html,
  pixelBasedPreset,
  Preview,
  Tailwind,
  Text,
} from "@react-email/components";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface AppointmentCancelledEmailProps {
  notes: string;
  subject: string;
  body: string;
}

export const AppointmentCancelledEmail = ({
  notes = "Sin motivo alguno. Esto es un mensaje de prueba para ver como se ve el texto en el email.",
  subject = "Cita cancelada",
  body,
}: AppointmentCancelledEmailProps) => {
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

            <Text className="text-pretty">{body}</Text>

            <Container className="mb-4 rounded-lg bg-muted p-4">
              <Text className="m-0 mb-[8px] text-gray-700 text-sm italic">
                {notes}
              </Text>
            </Container>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentCancelledEmail;
