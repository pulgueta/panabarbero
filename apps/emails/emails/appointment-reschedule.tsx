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

export interface AppointmentRescheduleEmailProps {
  appointmentDate: string;
  appointmentTime: string;
  service: string;
}

export const AppointmentRescheduleEmail = ({
  appointmentDate,
  appointmentTime,
  service,
}: AppointmentRescheduleEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Reagendamiento de cita - PanaBarbero</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-gray-100 py-[40px] font-sans">
          <Container className="mx-auto w-full max-w-md rounded border border-border/50 bg-white p-8">
            <Header />

            <Section className="mb-[24px] rounded-[8px] bg-gray-50 p-[24px]">
              <Heading className="m-0 mb-[16px] font-bold text-[20px] text-gray-900">
                Appointment Details
              </Heading>

              <Text className="m-0 mb-[8px] text-[16px] text-gray-700">
                <strong>Barber:</strong> John Doe
              </Text>
              <Text className="m-0 text-[16px] text-gray-700">
                <strong>Duration:</strong> 45 minutes
              </Text>
            </Section>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Button
                href="https://classiccuts.com/reschedule"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Reagendar
              </Button>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentRescheduleEmail;
