import {
  Body,
  Container,
  Head,
  Html,
  pixelBasedPreset,
  Preview,
  Tailwind,
  Text,
} from "react-email";

import { tailwindConfig } from "../tailwind-config";
import { Header } from "./components/header";

export interface AppointmentReassignedEmailProps {
  barbershopName: string;
  newBarberName: string;
}

export const AppointmentReassignedEmail = ({
  barbershopName,
  newBarberName,
}: AppointmentReassignedEmailProps) => {
  const subject = `Tu cita en ${barbershopName} ha sido reasignada`;

  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Text className="text-pretty">
              Tu cita en <strong>{barbershopName}</strong> ha sido reasignada a{" "}
              <strong>{newBarberName}</strong>. La fecha y hora de tu cita
              permanecen igual.
            </Text>

            <Text className="text-sm text-zinc-500">
              Si tienes alguna pregunta, contacta directamente a la barbería.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentReassignedEmail;
