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

export interface PastAppointmentReminderEmailProps {
  subject: string;
}

export const PastAppointmentReminderEmail = ({
  subject = "Recordatorio de cita pasada",
}: PastAppointmentReminderEmailProps) => {
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
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Text className="mb-4 text-pretty">
              Haz tenido una cita hace poco, no olvides marcar su estado final.
            </Text>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Button
                href="https://www.panabarbero.com/profile/barbershop/appointments"
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Ver citas
              </Button>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default PastAppointmentReminderEmail;
