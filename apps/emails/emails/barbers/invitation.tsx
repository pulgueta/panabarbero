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

export type BarberInvitationEmailProps = {
  barbershopName: string;
  invitationLink: string;
  inviterName?: string;
  inviteeName?: string;
  expiresLabel?: string;
};

export const BarberInvitationEmail = ({
  barbershopName,
  invitationLink,
  inviterName,
  inviteeName,
  expiresLabel,
}: BarberInvitationEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`Invitación para unirte a ${barbershopName}`}</Preview>
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
          theme: tailwindConfig.theme,
        }}
      >
        <Body className="bg-gray-100 font-sans">
          <Container className="mx-auto w-full max-w-md rounded-xl border border-border/50 bg-white p-4">
            <Header />

            <Section className="my-4">
              <Text className="m-0 mb-2 text-gray-700 text-sm">
                {inviteeName ? `Hola ${inviteeName},` : "Hola,"}
              </Text>

              <Text className="m-0 mb-2 text-gray-700 text-sm">
                {inviterName
                  ? `${inviterName} te ha invitado a unirte a ${barbershopName} como parte del equipo.`
                  : `Te han invitado a unirte a ${barbershopName} como parte del equipo.`}
              </Text>

              <Text className="m-0 mb-4 text-gray-700 text-sm">
                Presiona el siguiente botón para aceptar la invitación y crear
                tu cuenta.
              </Text>
            </Section>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Link
                href={invitationLink}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Aceptar invitación
              </Link>
            </Section>

            {expiresLabel ? (
              <Section className="mb-4">
                <Text className="m-0 text-gray-500 text-xs">
                  Esta invitación vence {expiresLabel}.
                </Text>
              </Section>
            ) : null}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default BarberInvitationEmail;



