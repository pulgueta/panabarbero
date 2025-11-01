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

export function seo({
  title,
  description,
  keywords,
  image,
}: {
  title: string;
  description?: string;
  image?: string;
  keywords?: string;
}) {
  const tags = [
    { title },
    { name: "description", content: description },
    { name: "keywords", content: keywords },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:creator", content: "@tannerlinsley" },
    { name: "twitter:site", content: "@tannerlinsley" },
    { name: "og:type", content: "website" },
    { name: "og:title", content: title },
    { name: "og:description", content: description },
    ...(image
      ? [
          { name: "twitter:image", content: image },
          { name: "twitter:card", content: "summary_large_image" },
          { name: "og:image", content: image },
        ]
      : []),
  ];

  return tags;
}
