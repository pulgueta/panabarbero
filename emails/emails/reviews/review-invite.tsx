import {
  Body,
  Button,
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

export interface ReviewInviteEmailProps {
  subject: string;
  body: string;
  url: string;
}

export const ReviewInviteEmail = ({
  subject = "Califica tu visita",
  body = "¿Cómo te fue en tu última visita? Cuéntanos con una reseña.",
  url = "https://panabarbero.com",
}: ReviewInviteEmailProps) => {
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

            <Text className="mb-4 text-pretty">{body}</Text>

            <Button
              href={url}
              className="rounded-md px-4 py-2 text-center font-medium"
              style={{ backgroundColor: "#b3342b", color: "#ffffff" }}
            >
              Dejar reseña
            </Button>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default ReviewInviteEmail;
