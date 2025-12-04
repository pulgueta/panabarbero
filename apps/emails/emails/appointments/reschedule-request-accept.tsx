import {
  Body,
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

export interface RescheduleRequestAcceptEmailProps {
  subject: string;
}

export const RescheduleRequestAcceptEmail = ({
  subject = "Reagendamiento aceptado",
}: RescheduleRequestAcceptEmailProps) => {
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
                Tu solicitud de reagendamiento ha sido aceptada.
              </Text>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default RescheduleRequestAcceptEmail;
