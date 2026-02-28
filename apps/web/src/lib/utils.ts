import type { Barbershop } from "@convex/tables";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { ConvexError } from "convex/values";
import type { DetailedHTMLProps, MetaHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

import { env } from "@/env";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? "https://panabarbero.com"
  : "http://localhost:3000";

export function barbershopSeo(
  barbershop: Barbershop | null,
): DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>[] {
  return [
    {
      name: "title",
      content: `Descubre ${barbershop?.name} en PanaBarbero`,
    },
    {
      name: "description",
      content: `Visita ${barbershop?.name} en PanaBarbero y reserva tu cita ahora.`,
    },
    {
      name: "og:title",
      content: `Descubre ${barbershop?.name} en PanaBarbero`,
    },
    {
      name: "og:description",
      content: `Visita ${barbershop?.name} en PanaBarbero y reserva tu cita ahora.`,
    },
    {
      name: "og:image",
      content: `${env.VITE_STORAGE_URL}/panabarbero-og.png`,
    },
    {
      name: "og:url",
      content: `${baseUrl}/barbershops/${barbershop?.uuid}`,
    },
    {
      name: "og:type",
      content: "website",
    },
  ];
}

export function seo({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return [
    { title },
    { name: "description", content: description },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:creator", content: "@panabarbero" },
    { name: "twitter:site", content: "@panabarbero" },
    { name: "twitter:url", content: baseUrl },
    { name: "og:type", content: "website" },
    { name: "og:title", content: title },
    { name: "og:description", content: description },
    {
      name: "og:image",
      content: `${env.VITE_STORAGE_URL}/panabarbero-og.png`,
    },
    { name: "og:url", content: baseUrl },
    {
      charSet: "utf-8",
    },
    {
      name: "viewport",
      content: "width=device-width, initial-scale=1",
    },
  ];
}

export function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function isAuthError(error: unknown) {
  const message =
    (error instanceof ConvexError && error.data) ||
    (error instanceof Error && error.message) ||
    "";

  return /auth/i.test(message);
}
