# SEO Implementation Summary

SEO implementation for PanaBarbero following TanStack Start patterns: canonical
URLs, structured data (JSON-LD), a sitemap, robots.txt, an `llms.txt`, and
enhanced meta tags across public routes.

> **Accuracy note:** this file is verified against the current code. Where an
> earlier draft was wrong, the correction is called out inline. Most SEO helpers
> live in `src/lib/utils.ts`.

---

## 1. SEO Utilities (`src/lib/utils.ts`)

### Meta-tag helpers

#### `seo()` — generic meta tags
```typescript
seo({
  title: string
  description: string
  ogImage?: string
  canonical?: string
  ogType?: string // default: "website"
})
```
- Returns an array of `<meta>` tag descriptors (title, description, Open Graph,
  Twitter Card)
- Twitter handles are hard-coded to `@panabarbero`
  (`twitter:creator`, `twitter:site`)

#### `barbershopSeo(barbershop: Barbershop | null)` — barbershop meta tags
- **Single argument.** The `metadata` parameter and the rating-in-title logic are
  **commented out** in the current code — do not document a `metadata` arg as
  functional.
- Generates name/description-based tags and OG locality/region for local business

#### `barbershopStructuredData(barbershop, metadata?, reviews?)` — `BarberShop` JSON-LD
- Address, opening hours, contact, aggregate rating, up to 10 reviews, social
  links

### Structured-data helpers

| Function | Output | Used on |
|---|---|---|
| `websiteStructuredData()` | `WebSite` + `Organization` JSON-LD | `/` |
| `softwareApplicationStructuredData()` | `SoftwareApplication` JSON-LD | `/`, `/ai` |
| `faqStructuredData()` | `FAQPage` JSON-LD | `/` (homepage FAQs) |
| `barbershopStructuredData()` | `BarberShop` JSON-LD | barbershop detail |
| `breadcrumbStructuredData(items)` | `BreadcrumbList` JSON-LD | listing + detail |

> **Correction:** there is **no `organizationStructuredData()`** export. The
> homepage uses **`websiteStructuredData()`** (which embeds the Organization).

### URL/base helpers

| Function | Exported? | Purpose |
|---|---|---|
| `getBaseUrl()` | yes | Returns the prod/local base URL (see §6) |
| `getCanonicalUrl(path)` | yes | Full canonical URL for a path |
| `getOgImageUrl(customImage?)` | **no — module-private** | Resolves the OG image (used internally) |

> **Correction:** `getOgImageUrl()` is **not exported**; do not reference it as a
> public helper.

---

## 2. Dynamic Routes

### Sitemap (`src/routes/sitemap[.]xml.ts`)
- **Static pages only** — `/` (daily, 1.0), `/ai` (weekly, 0.8), `/pricing`
  (weekly, 0.8), `/privacy-policy` (monthly, 0.5), `/tos` (monthly, 0.5)
- Cached 24h, graceful fallback on error
- **Correction:** the sitemap does **not** currently enumerate `/barbershops` or
  individual `/barbershops/:uuid` URLs. (Adding dynamic barbershop URLs is a
  reasonable enhancement, but it is not implemented today.)
- Access: `https://www.panabarbero.com/sitemap.xml`

### Robots.txt (`src/routes/robots[.]txt.ts`)
- Allows public pages; **disallows** `/profile`, `/appointments`, `/invitations`,
  query params (`/*?*`) and underscore paths (`/_*`)
- **Blocks** these agents entirely with `Disallow: /` — `AhrefsBot`, `SemrushBot`,
  `DotBot`, `MJ12bot`, `Nmap`, `sqlmap`
- **Correction:** these bots are **fully blocked**, not rate-limited. There are
  **no `crawl-delay` values** in the output.
- Cached 7 days; references the sitemap
- Access: `https://www.panabarbero.com/robots.txt`

### llms.txt (`src/routes/llms[.]txt.ts`)
- Markdown summary for LLM discovery (description, features, key data, contact)
- Cached 24h
- **This route was previously undocumented** — it exists and is part of the SEO
  surface.

---

## 3. Route-Level SEO

| Route | File | SEO applied |
|---|---|---|
| `/` | `index.tsx` | `seo()` + canonical + `websiteStructuredData()` + `softwareApplicationStructuredData()` + `faqStructuredData()` + breadcrumb + keywords |
| `/ai` | `ai.tsx` | `seo()` + canonical + `softwareApplicationStructuredData()` |
| `/chat` | `chat/index.tsx` | `seo()` + canonical |
| `/pricing` | `pricing.tsx` | `seo()` + canonical |
| `/barbershops` | `barbershops/index.tsx` | dynamic title by city/state + `seo()` + canonical + breadcrumb |
| `/barbershops/$barbershopUuid` | `barbershops/$barbershopUuid/index.tsx` | `barbershopSeo()` + canonical + `barbershopStructuredData()` + breadcrumb |
| `/privacy-policy` | `privacy-policy.tsx` | `seo()` + canonical |
| `/tos` | `tos.tsx` | `seo()` + canonical |

> **Corrections:**
> - The barbershop detail route is **`barbershops/$barbershopUuid/index.tsx`**
>   (a directory with `index.tsx`), not `$barbershopUuid.tsx`.
> - There is **no `/appointments/create` route.** The booking page is
>   **`/barbershops/$barbershopUuid/book`** and currently has **no `head()` SEO**
>   (it is a public but non-indexed booking form).
> - `/ai` and `/chat` also carry SEO and were previously undocumented.

---

## 4. Canonical URLs

Public pages set `links: [{ rel: "canonical", href: getCanonicalUrl("/path") }]`
to consolidate link equity and declare the preferred URL.

---

## 5. Structured Data (JSON-LD)

### `BarberShop` schema (detail page)
Business name, description, address, opening hours (incl. lunch breaks), contact
(phone/email/website), aggregate rating + review count, up to 10 reviews, social
links, price-range indicator.

```json
{
  "@context": "https://schema.org",
  "@type": "BarberShop",
  "name": "Barbería El Pana",
  "url": "https://www.panabarbero.com/barbershops/...",
  "telephone": "+57...",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Medellín",
    "addressRegion": "Antioquia",
    "addressCountry": "CO"
  },
  "openingHoursSpecification": [...],
  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.8", "reviewCount": "25" },
  "review": [...]
}
```

> Reviews are **schema-only** today (no in-app review creation) — `aggregateRating`
> and `review` only render when the `reviews` table is populated. See
> `customer-flow.md` §11.

### `WebSite` + `Organization`, `SoftwareApplication`, `FAQPage`
Rendered on the homepage (and `SoftwareApplication` also on `/ai`) for brand and
rich-result coverage.

---

## 6. Environment Handling

`getBaseUrl()` decides the base URL from `process.env.NODE_ENV`:

```typescript
const isProduction = process.env.NODE_ENV === "production";
const baseUrl = isProduction
  ? "https://www.panabarbero.com"   // note the www subdomain
  : "http://localhost:3000";
```

---

## 7. Crawler Behaviour (robots.txt)

- **Allowed:** Googlebot, Bingbot, and other reputable crawlers (no crawl-delay)
- **Blocked (`Disallow: /`):** AhrefsBot, SemrushBot, DotBot, MJ12bot, Nmap,
  sqlmap

---

## 8. Verifying the SEO Implementation

```bash
curl https://www.panabarbero.com/sitemap.xml
curl https://www.panabarbero.com/robots.txt
curl https://www.panabarbero.com/llms.txt
```

- Validate JSON-LD: https://search.google.com/test/rich-results
- Inspect `<head>` meta tags in DevTools
- Preview social cards: Facebook OG debugger / Twitter Card validator

---

## 9. Possible Enhancements (not implemented)

- [ ] Add dynamic `/barbershops` and `/barbershops/:uuid` URLs to the sitemap
- [ ] Wire up review creation so `aggregateRating`/`review` populate naturally
- [ ] Restore the `metadata` argument in `barbershopSeo()` (currently commented out)
- [ ] Add booking-page SEO if the booking flow should be discoverable

---

## Files Involved

| File | Role |
|---|---|
| `src/lib/utils.ts` | SEO helpers (`seo`, `barbershopSeo`, `*StructuredData`, URL helpers) |
| `src/routes/__root.tsx` | canonical + sitemap reference |
| `src/routes/index.tsx` | website/software/FAQ structured data |
| `src/routes/ai.tsx`, `src/routes/chat/index.tsx` | `seo()` + canonical |
| `src/routes/pricing.tsx` | `seo()` + canonical |
| `src/routes/barbershops/index.tsx` | dynamic listing head |
| `src/routes/barbershops/$barbershopUuid/index.tsx` | barbershop structured data |
| `src/routes/privacy-policy.tsx`, `src/routes/tos.tsx` | `seo()` + canonical |
| `src/routes/sitemap[.]xml.ts` | dynamic sitemap (static pages) |
| `src/routes/robots[.]txt.ts` | robots.txt with bot blocks |
| `src/routes/llms[.]txt.ts` | llms.txt for LLM discovery |
