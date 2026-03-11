import { createFileRoute } from "@tanstack/react-router";

import { getBaseUrl } from "@/lib/utils";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = getBaseUrl();

        const content = `# PanaBarbero

> PanaBarbero es la plataforma de gestión de barberías para Colombia y Latinoamérica.
> Permite a barberías agendar citas, gestionar equipos de barberos y enviar recordatorios automáticos a clientes por email y SMS.

## Sitio

- Inicio: ${baseUrl}
- Barberías: ${baseUrl}/barbershops
- Agendar cita: ${baseUrl}/appointments/create
- Precios: ${baseUrl}/pricing
- Política de privacidad: ${baseUrl}/privacy-policy
- Términos de servicio: ${baseUrl}/tos

## Características principales

- Agenda de citas 24/7 sin llamadas telefónicas
- Recordatorios automáticos por email y SMS antes de cada cita
- Gestión de equipos: múltiples barberos con agendas independientes
- Reservas en tiempo real con verificación de disponibilidad
- Planes: Gratuito, Pro y Premium

## Datos clave

- Público objetivo: barberos y sus clientes en Colombia y Latinoamérica
- Idioma principal: Español (es-CO)
- Sector: Servicios de peluquería y barbería

## Contacto

- Sitio web: ${baseUrl}
- Email: support@panabarbero.com
- Twitter: https://twitter.com/panabarbero
- Instagram: https://instagram.com/panabarbero
`;

        return new Response(content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=86400",
          },
        });
      },
    },
  },
});
