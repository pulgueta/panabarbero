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
      content: barbershop.description ?? "No hay descripción disponible.",
    },
    {
      name: "og:title",
      content: `${barbershop.name} - PanaBarbero`,
    },
    {
      name: "og:description",
      content: barbershop.description ?? "No hay descripción disponible.",
    },
    {
      name: "og:image",
      content: barbershop.bannerUrl ?? "/default-logo.png",
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
