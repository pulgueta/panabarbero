import type { FC } from "react";
import {
  Body,
  Column,
  Container,
  Head,
  Hr,
  Html,
  pixelBasedPreset,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "react-email";

import { tailwindConfig } from "../../tailwind-config";
import { Footer } from "../components/footer";
import { Header } from "../components/header";

export interface SaleReceiptLine {
  name: string;
  quantity: number;
  /** Preformatted COP amounts — the template stays presentation-only. */
  unitPrice: string;
  lineTotal: string;
}

export interface SaleReceiptEmailProps {
  subject: string;
  barbershopName: string;
  receiptNumber: string;
  soldAtLabel: string;
  customerName: string;
  customerDocument?: string;
  lines: SaleReceiptLine[];
  total: string;
  paymentMethodLabel: string;
  paymentReference?: string;
}

export const SaleReceiptEmail: FC<SaleReceiptEmailProps> = ({
  subject = "Recibo de tu compra",
  barbershopName,
  receiptNumber,
  soldAtLabel,
  customerName,
  customerDocument,
  lines,
  total,
  paymentMethodLabel,
  paymentReference,
}) => {
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

            <Section className="mb-2 text-center">
              <Text className="mb-0 font-semibold text-lg">
                Recibo de compra
              </Text>
              <Text className="mt-1 mb-0 text-muted-foreground text-sm">
                {barbershopName}
              </Text>
              <Text className="mt-1 mb-0 text-muted-foreground text-xs">
                N.º {receiptNumber} · {soldAtLabel}
              </Text>
            </Section>

            <Hr className="border-border" />

            <Section className="mb-2">
              <Text className="mb-0 text-muted-foreground text-xs uppercase">
                Cliente
              </Text>
              <Text className="mt-1 mb-0 text-sm">
                {customerName}
                {customerDocument ? ` · ${customerDocument}` : ""}
              </Text>
            </Section>

            <Hr className="border-border" />

            <Section className="mb-2">
              {lines.map((line) => (
                <Row key={`${line.name}-${line.quantity}`} className="mb-1">
                  <Column>
                    <Text className="my-0 text-sm">
                      {line.quantity} × {line.name}
                    </Text>
                    <Text className="my-0 text-muted-foreground text-xs">
                      {line.unitPrice} c/u
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="my-0 text-sm">{line.lineTotal}</Text>
                  </Column>
                </Row>
              ))}
            </Section>

            <Hr className="border-border" />

            <Section className="mb-2">
              <Row>
                <Column>
                  <Text className="my-0 font-semibold text-sm">Total</Text>
                </Column>
                <Column align="right">
                  <Text className="my-0 font-semibold text-base">{total}</Text>
                </Column>
              </Row>
              <Text className="mt-2 mb-0 text-muted-foreground text-xs">
                Pago: {paymentMethodLabel}
                {paymentReference ? ` · Ref. ${paymentReference}` : ""}
              </Text>
            </Section>

            <Text className="mb-4 text-pretty text-muted-foreground text-xs">
              Gracias por tu compra en {barbershopName}. Este correo es el
              comprobante de tu compra; consérvalo como soporte.
            </Text>

            <Footer />
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default SaleReceiptEmail;
