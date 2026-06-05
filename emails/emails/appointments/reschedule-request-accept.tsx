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
} from "react-email";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface RescheduleRequestAcceptEmailProps {
  subject: string;
  body: string;
}

export const RescheduleRequestAcceptEmail = ({
  subject = "Reagendamiento aceptado",
  body = "Tu solicitud de reagendamiento ha sido aceptada",
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
        <Body className="bg-zinc-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Section className="my-4">
              <Text className="m-0 mb-[8px] text-zinc-700 text-sm">{body}</Text>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default RescheduleRequestAcceptEmail;
