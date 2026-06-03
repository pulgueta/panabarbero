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

export type AppointmentCreatedEmailProps = {
  body: string;
} & (
  | {
      sendTo: "customer";
      subject: string;
    }
  | {
      sendTo: "barber";
      requestUrl: string;
      subject: string;
    }
);

export const AppointmentCreatedEmail = (
  props: AppointmentCreatedEmailProps,
) => {
  const { sendTo, subject, body = "Cita creada correctamente" } = props;

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

            {sendTo === "barber" && (
              <Section className="mb-4 flex w-full items-center justify-center">
                <Link
                  href={props.requestUrl}
                  className="rounded-md bg-primary px-4 py-2 text-primary-foreground text-sm"
                >
                  Ver detalles
                </Link>
              </Section>
            )}

            {/* <Footer /> */}
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentCreatedEmail;
