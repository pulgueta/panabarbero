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

import { tailwindConfig } from "../../tailwind-config";
import { Header } from "../components/header";

export interface AppointmentUpdatedEmailProps {
  notes: string;
  subject: string;
  body: string;
}

export const AppointmentUpdatedEmail = ({
  notes = "Se actualizaron los servicios de tu cita.",
  subject = "Cita actualizada",
  body,
}: AppointmentUpdatedEmailProps) => {
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

            <Container className="mb-4 rounded-lg bg-muted p-4">
              <Text className="m-0 mb-[8px] text-zinc-700 text-sm italic">
                {notes}
              </Text>
            </Container>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default AppointmentUpdatedEmail;
