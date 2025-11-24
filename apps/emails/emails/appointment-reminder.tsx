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

import { tailwindConfig } from "../tailwind-config";
import { Header } from "./components/header";

export interface AppointmentReminderEmailProps {
  barbershopName: string;
}

export const AppointmentReminderEmail = ({
  barbershopName,
}: AppointmentReminderEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Recordatorio de cita - PanaBarbero</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-gray-100 py-4 font-sans">
          <Container className="mx-auto w-full max-w-md rounded border border-border/50 bg-white px-6 py-2">
            <Header />

            <Text className="mb-4 text-pretty">
              <strong>¡Recuerda!</strong> Tienes una cita en ~30 minutos en{" "}
              {barbershopName}.
            </Text>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentReminderEmail;

AppointmentReminderEmail.PreviewProps = {
  barbershopName: "Eduardo Barberia",
} as AppointmentReminderEmailProps;
