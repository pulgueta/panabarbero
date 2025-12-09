import {
  Body,
  Container,
  Head,
  Html,
  Link,
  pixelBasedPreset,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface UserScheduleEmailProps {
  requestUrl: string;
}

export const UserScheduleEmail = ({ requestUrl }: UserScheduleEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>Nueva cita - PanaBarbero</Preview>
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
                Un usuario ha agendado una cita en tu barbería.
              </Text>
            </Section>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Link
                href={requestUrl}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Ver detalles
              </Link>
            </Section>

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default UserScheduleEmail;
