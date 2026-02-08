import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  pixelBasedPreset,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export type OrgInvitationEmailProps = {
  organizationName: string;
  inviteLink: string;
  inviterName: string;
};

export const OrgInvitationEmail = ({
  organizationName,
  inviteLink,
  inviterName,
}: OrgInvitationEmailProps) => {
  return (
    <Html lang="es" dir="ltr">
      <Head />
      <Preview>{`Invitación para unirte a ${organizationName}`}</Preview>
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
                {inviterName} te ha invitado a unirte a la organización{" "}
                <strong>{organizationName}</strong>.
              </Text>

              <Text className="m-0 mb-4 text-gray-700 text-sm">
                Al aceptar esta invitación, podrás acceder a todas las barberías
                y recursos de la organización.
              </Text>
            </Section>

            <Section className="mb-4 flex w-full items-center justify-center">
              <Link
                href={inviteLink}
                className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
              >
                Aceptar invitación
              </Link>
            </Section>

            <Section className="mb-4">
              <Text className="m-0 text-gray-500 text-xs">
                Si no esperabas esta invitación, puedes ignorar este correo.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default OrgInvitationEmail;
