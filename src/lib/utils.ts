import type { Barbershop, BarbershopMetadata, Review } from "@convex/schema";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { ConvexError } from "convex/values";
import type {
  DetailedHTMLProps,
  MetaHTMLAttributes,
  ScriptHTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";

import { env } from "@/env";
import { getLogoUrl } from "@/hooks/use-upload";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return "";

  let formatted = phone.replace(/\s/g, "");

  if (formatted.startsWith("+57")) {
    formatted = formatted.slice(3);
  }

  if (formatted.startsWith("0")) {
    formatted = formatted.slice(1);
  }

  return formatted;
}

const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? "https://panabarbero.com"
  : "http://localhost:3000";

/**
 * Get base URL for current environment
 */
export function getBaseUrl(): string {
  return baseUrl;
}

/**
 * Generate canonical URL
 */
export function getCanonicalUrl(path: string): string {
  return `${baseUrl}${path}`;
}

/**
 * Generate OG image URL
 */
export function getOgImageUrl(customImage?: string | null): string {
  return customImage ?? `${env.VITE_STORAGE_URL}/panabarbero-og.png`;
}

/**
 * Generic SEO meta tags with canonical URL support
 */
export function seo({
  title,
  description,
  ogImage,
  canonical,
  ogType = "website",
}: {
  title: string;
  description: string;
  ogImage?: string;
  canonical?: string;
  ogType?: string;
}) {
  const url = canonical || baseUrl;
  const image = getOgImageUrl(ogImage);

  return [
    { title },
    { name: "description", content: description },
    { property: "og:type", content: ogType },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    { property: "og:image", content: image },
    { property: "og:url", content: url },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: image },
    { name: "twitter:creator", content: "@panabarbero" },
    { name: "twitter:site", content: "@panabarbero" },
  ];
}

/**
 * Barbershop SEO meta tags with canonical URL and ratings
 */
export function barbershopSeo(
  barbershop: Barbershop | null,
  // metadata?: BarbershopMetadata | null,
): DetailedHTMLProps<MetaHTMLAttributes<HTMLMetaElement>, HTMLMetaElement>[] {
  if (!barbershop) {
    return [];
  }

  const canonical = getCanonicalUrl(`/barbershops/${barbershop.uuid}`);
  const description =
    barbershop.description ||
    `Visita ${barbershop.name} en PanaBarbero y reserva tu cita ahora.`;
  // const rating = metadata?.rating ? `${metadata.rating.toFixed(1)}⭐` : "";
  // const ratingText = rating
  //   ? ` - ${rating} (${metadata?.reviews} reseñas)`
  //   : "";
  const title = `${barbershop.name} en PanaBarbero`;

  return [
    { title },
    {
      name: "description",
      content: `${description} ${barbershop.contactPhone || ""}`.trim(),
    },
    // Open Graph
    { property: "og:type", content: "business.business" },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
    {
      property: "og:image",
      content: getOgImageUrl(getLogoUrl(barbershop.logoKey)),
    },
    { property: "og:url", content: canonical },
    { property: "og:locality", content: barbershop.city },
    { property: "og:region", content: barbershop.state },
    // Twitter
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: title },
    { name: "twitter:description", content: description },
    {
      name: "twitter:image",
      content: getOgImageUrl(getLogoUrl(barbershop.logoKey)),
    },
    // SEO
    { name: "robots", content: "index, follow" },
  ];
}

/**
 * BarberShop structured data (JSON-LD)
 */
export function barbershopStructuredData(
  barbershop: Barbershop,
  metadata?: BarbershopMetadata | null,
  reviews?: Review[],
): ScriptHTMLAttributes<HTMLScriptElement> & { children: string } {
  const address = {
    "@type": "PostalAddress",
    streetAddress: barbershop.address.fullAddress,
    addressLocality: barbershop.city,
    addressRegion: barbershop.state,
    postalCode: barbershop.zipCode,
    addressCountry: "CO",
  };

  // Build opening hours specification
  const openingHoursSpecification = barbershop.availability.map((avail) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek:
      avail.weekDay.day.charAt(0).toUpperCase() + avail.weekDay.day.slice(1),
    opens: avail.openAt,
    closes: avail.closeAt,
  }));

  // Aggregate rating
  // const aggregateRating = metadata?.rating
  //   ? {
  //       "@type": "AggregateRating",
  //       ratingValue: metadata.rating.toFixed(1),
  //       reviewCount: metadata.reviews || 0,
  //       bestRating: "5",
  //       worstRating: "1",
  //     }
  //   : null;

  // Reviews array (limit to 10)
  const reviewsArray = (reviews || []).slice(0, 10).map((review) => ({
    "@type": "Review",
    author: {
      "@type": "Person",
      name: "Cliente",
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: review.rating,
      bestRating: "5",
      worstRating: "1",
    },
    reviewBody: review.comment || "",
  }));

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: barbershop.name,
    description: barbershop.description || "",
    url: getCanonicalUrl(`/barbershops/${barbershop.uuid}`),
    telephone: barbershop.contactPhone || "",
    address,
    openingHoursSpecification,
    // ...(aggregateRating && { aggregateRating }),
    ...(reviewsArray.length > 0 && { review: reviewsArray }),
    ...(metadata?.contactEmail && { email: metadata.contactEmail }),
    ...(metadata?.websiteUrl && { sameAs: metadata.websiteUrl }),
    ...(metadata?.socialMedia &&
      metadata.socialMedia.length > 0 && {
        sameAs: metadata.socialMedia.map((social) => social.url),
      }),
    priceRange: "$",
  };

  return {
    type: "application/ld+json",
    children: JSON.stringify(structuredData),
  };
}

/**
 * WebSite + Organization structured data (JSON-LD) for the root layout.
 * Provides site-wide context for both search engines and AI systems (LLMO).
 */
export function websiteStructuredData(): ScriptHTMLAttributes<HTMLScriptElement> & {
  children: string;
} {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "PanaBarbero",
      url: baseUrl,
      description:
        "La solución para las barberías - Gestiona citas y clientes fácilmente",
      publisher: {
        "@type": "Organization",
        name: "PanaBarbero",
        url: baseUrl,
        logo: {
          "@type": "ImageObject",
          url: `${env.VITE_STORAGE_URL}/panabarbero-logo.png`,
        },
        sameAs: ["https://dub.sh/z11b1Xb", "https://dub.sh/f48mIt9"],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "Customer Support",
          email: "support@panabarbero.com",
        },
      },
    }),
  };
}

/**
 * FAQPage structured data (JSON-LD).
 * Particularly effective for LLMO — AI systems extract Q&A pairs directly.
 */
export function faqStructuredData(
  faqs: Array<{ question: string; answer: string }>,
): ScriptHTMLAttributes<HTMLScriptElement> & { children: string } {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    }),
  };
}

/**
 * BreadcrumbList structured data (JSON-LD)
 */
export function breadcrumbStructuredData(
  items: Array<{ name: string; url: string }>,
): ScriptHTMLAttributes<HTMLScriptElement> & { children: string } {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    }),
  };
}

export function softwareApplicationStructuredData(): ScriptHTMLAttributes<HTMLScriptElement> & {
  children: string;
} {
  return {
    type: "application/ld+json",
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "PanaBarbero",
      url: baseUrl,
      description:
        "La solución para las barberías - Gestiona citas y clientes fácilmente",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web, iOS, Android",
      inLanguage: "es-CO",
      author: {
        "@type": "Organization",
        name: "PanaBarbero",
        url: baseUrl,
      },
      featureList: [
        "Reserva de citas en línea",
        "Gestión de barberos y servicios",
        "Notificaciones por email y SMS",
        "Reagendamiento de citas",
        "Reservas sin cuenta de usuario",
        "Panel de administración para barberías",
        "Invitaciones a barberos del equipo",
      ],
      sameAs: ["https://dub.sh/z11b1Xb", "https://dub.sh/f48mIt9"],
    }),
  };
}

export function formatCurrency(amount: number, currency = "COP"): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    currencyDisplay: "code",
  }).format(amount);
}

export function isAuthError(error: unknown) {
  const message =
    (error instanceof ConvexError && error.data) ||
    (error instanceof Error && error.message) ||
    "";

  return /auth/i.test(message);
}
