import type { Barbershop, BarbershopMetadata, Review } from "@convex/schema";
import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import type {
  DetailedHTMLProps,
  MetaHTMLAttributes,
  ScriptHTMLAttributes,
} from "react";
import { twMerge } from "tailwind-merge";

import { clientEnv } from "@/env/client";
import { getLogoUrl } from "@/hooks/use-upload";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? "https://www.panabarbero.com"
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
function getOgImageUrl(customImage?: string | null): string {
  return customImage ?? `${clientEnv.VITE_STORAGE_URL}/panabarbero-og.png`;
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
    { name: "twitter:url", content: url },
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
          url: `${clientEnv.VITE_STORAGE_URL}/panabarbero-logo.png`,
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

const currencyFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  minimumFractionDigits: 0,
  currencyDisplay: "code",
});

const usdFormatter = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  currencyDisplay: "code",
});

export function formatCurrency(amount: number, currency = "COP"): string {
  if (currency === "USD") return usdFormatter.format(amount);
  return currencyFormatter.format(amount);
}

const longDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const shortMonthDayFormatter = new Intl.DateTimeFormat("es-CO", {
  month: "long",
  day: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("es-CO", {
  hour: "numeric",
  minute: "2-digit",
});

const weekdayFormatter = new Intl.DateTimeFormat("es-CO", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** Format a timestamp (or Date) as `02 de enero de 2024`. */
export function formatLongDate(value: number | Date): string {
  return longDateFormatter.format(
    typeof value === "number" ? new Date(value) : value,
  );
}

/** Format a timestamp (or Date) including time. */
export function formatLongDateTime(value: number | Date): string {
  return dateTimeFormatter.format(
    typeof value === "number" ? new Date(value) : value,
  );
}

/** Format a timestamp as `enero 2`. */
export function formatShortMonthDay(value: number | Date): string {
  return shortMonthDayFormatter.format(
    typeof value === "number" ? new Date(value) : value,
  );
}

/** Format a timestamp as `9:30 a. m.`. */
export function formatTimeOfDay(value: number | Date): string {
  return timeFormatter.format(
    typeof value === "number" ? new Date(value) : value,
  );
}

/** Format a timestamp as `lunes, 2 de enero`. */
export function formatWeekdayDate(value: number | Date): string {
  return weekdayFormatter.format(
    typeof value === "number" ? new Date(value) : value,
  );
}

/** Convert a timestamp to a Date with the same value. */
export function toDate(
  value: number | Date | undefined | null,
): Date | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? new Date(value) : value;
}

/** Combine a date with a time-of-day in minutes. */
export function dateWithTimeOfDay(
  date: number | Date,
  minutesOfDay: number,
): Date {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  const hours = Math.floor(minutesOfDay / 60);
  const minutes = minutesOfDay % 60;
  d.setHours(hours, minutes, 0, 0);
  return d;
}

/** Set the time of a date to midnight (start of day). */
export function startOfDay(date: number | Date): Date {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Set the time of a date to end of day. */
export function endOfDay(date: number | Date): Date {
  const d = typeof date === "number" ? new Date(date) : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Up-to-2-letter avatar initials from a name, falling back to the email. */
export function getInitials(name?: string | null, email?: string): string {
  const trimmed = name?.trim();
  if (trimmed) {
    return trimmed
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }
  return email?.[0]?.toUpperCase() ?? "U";
}
