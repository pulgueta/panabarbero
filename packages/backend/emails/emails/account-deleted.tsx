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
} from "react-email";

import { tailwindConfig } from "../tailwind-config";
import { Header } from "./components/header";

export interface AccountDeletedEmailProps {
  subject: string;
  body: string;
  url: string
}

export const AccountDeletedEmail = ({
  subject,
  body,
  url
}: AccountDeletedEmailProps) => {
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

            <Text className="text-pretty">{body}</Text>

            <Section className="flex w-full items-center justify-center">
              <Button
                href={`${url}/barbershops`}
                className="mx-auto rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Explorar barberías
              </Button>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AccountDeletedEmail;
