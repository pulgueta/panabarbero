import type { Metadata } from "next";
import type { OpenGraph } from "next/dist/lib/metadata/types/opengraph-types";

type SEOProps = Pick<Metadata, "title" | "description">;

export function generateSEO(metadata?: SEOProps): Metadata {
  const defaultTitle = "PanaBarbero - Encuentra barberias cercanas";
  const title = metadata?.title ?? "PanaBarbero";
  const description =
    metadata?.description ??
    "Encuentra barberias cercanas a ti y reserva tu cita fácilmente";
  const og = {
    url: "/logo.png",
    width: 1200,
    height: 630,
    alt: "PanaBarbero",
  } satisfies OpenGraph["images"];

  return {
    ...metadata,
    title: {
      template: `${title} | %s`,
      absolute: defaultTitle,
    },
    description,
    openGraph: {
      type: "website",
      title: {
        template: `${title} | %s`,
        absolute: defaultTitle,
      },
      description,
      images: [og],
    },
    twitter: {
      images: [og],
      title,
      description,
      card: "summary_large_image",
    },
    keywords: ["barberia", "barberias", "barbero", "barberos", "barberia"],
  };
}
