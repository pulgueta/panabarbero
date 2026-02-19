import type { Barbershop } from "@panabarbero/convex/schemas";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import type { DetailedHTMLProps, MetaHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function barbershopSeo(
  barbershop: Barbershop,
): DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>[] {
  const isProduction = process.env.NODE_ENV === "production";
  const baseUrl = isProduction
    ? "https://panabarbero.com"
    : "http://localhost:3000";

  return [
    {
      name: "title",
      content: `${barbershop.name} - PanaBarbero`,
    },
    {
      name: "description",
      content: `Visita ${barbershop.name} en PanaBarbero`,
    },
    {
      name: "og:title",
      content: `${barbershop.name} - PanaBarbero`,
    },
    {
      name: "og:description",
      content: `Visita ${barbershop.name} en PanaBarbero`,
    },
    {
      name: "og:image",
      content: `https://storage.panabarbero.com/panabarbero-og.png`,
    },
    {
      name: "og:url",
      content: `${baseUrl}/barbershops/${barbershop.uuid}`,
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
    { name: "twitter:creator", content: "@tannerlinsley" },
    { name: "twitter:site", content: "@tannerlinsley" },
    { name: "og:type", content: "website" },
    { name: "og:title", content: title },
    { name: "og:description", content: description },
  ];
}

export function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}
