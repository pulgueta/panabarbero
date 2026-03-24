# SEO Implementation Summary

## Overview
Comprehensive SEO implementation for PanaBarbero following TanStack Start best practices. Includes canonical URLs, structured data (JSON-LD), dynamic sitemaps, robots.txt, and enhanced meta tags across all public routes.

---

## 1. Enhanced SEO Utilities (`src/lib/utils.ts`)

### Core Functions

#### `seo()` - Generic SEO Meta Tags
```typescript
seo({
  title: string
  description: string
  ogImage?: string
  canonical?: string
  ogType?: string // default: "website"
})
```
- Returns meta tags for title, description, Open Graph, and Twitter Card
- Supports custom canonical URLs and custom OG images
- Used for static pages and dynamic route titles

#### `barbershopSeo()` - Barbershop-Specific Meta Tags
```typescript
barbershopSeo(barbershop: Barbershop | null, metadata?: BarbershopMetadata | null)
```
- Generates SEO tags with barbershop name, description, and ratings
- Includes Open Graph locality/region for local business
- Shows rating and review count in title when available
- Used for barbershop detail pages

#### `barbershopStructuredData()` - BarberShop JSON-LD Schema
```typescript
barbershopStructuredData(
  barbershop: Barbershop,
  metadata?: BarbershopMetadata | null,
  reviews?: Review[]
)
```
- Generates structured data for search engines and LLMs
- Includes: address, opening hours, contact info, ratings, reviews
- Limited to 10 most recent reviews
- Supports social media links and website metadata

#### `organizationStructuredData()` - Organization Schema
- For homepage Organization representation
- Includes company name, logo, description, contact, and social links
- Helps search engines understand brand

#### `breadcrumbStructuredData()` - Breadcrumb Navigation
```typescript
breadcrumbStructuredData(items: Array<{ name: string; url: string }>)
```
- Generates breadcrumb list for navigation hierarchy
- Useful for multi-level pages

### Helper Functions

| Function | Purpose |
|----------|---------|
| `getBaseUrl()` | Returns production/local domain |
| `getCanonicalUrl(path)` | Generates full canonical URL |
| `getOgImageUrl(customImage?)` | Returns OG image (custom or default) |

---

## 2. Dynamic Routes

### Sitemap (`src/routes/sitemap[.]xml.ts`)

**Features:**
- ✅ Auto-discovers all public pages and barbershops
- ✅ Includes change frequency and priority for each page
- ✅ Updates daily as new barbershops are added
- ✅ Cached for 24 hours
- ✅ Graceful fallback to static sitemap on errors

**Included Pages:**
- Home `/` (priority: 1.0, daily)
- Barbershops listing `/barbershops` (priority: 0.9, daily)
- Pricing `/pricing` (priority: 0.8, weekly)
- Privacy policy (priority: 0.5, monthly)
- Terms of service (priority: 0.5, monthly)
- Individual barbershops `/barbershops/:uuid` (priority: 0.7, weekly)

**Access:** `https://www.panabarbero.com/sitemap.xml`

### Robots.txt (`src/routes/robots[.]txt.ts`)

**Rules:**
- ✅ Allow all public pages
- ✅ Disallow private routes: `/profile`, `/appointments`, `/invitations`
- ✅ Disallow query parameters to prevent duplicate content
- ✅ Rate limiting for aggressive crawlers (10s delay for AhrefsBot, SemrushBot, etc.)
- ✅ Block known malicious bots (Nmap, sqlmap, etc.)
- ✅ Cached for 7 days

**Access:** `https://www.panabarbero.com/robots.txt`

---

## 3. Route-Level SEO Implementations

### Home Page (`/`)
```typescript
head: () => ({
  meta: seo({
    title: "PanaBarbero - Descubre barberías y reserva citas",
    description: "Encuentra barberías, reserva citas y gestiona tu barbería con PanaBarbero.",
    canonical: getCanonicalUrl("/"),
  }),
  scripts: [organizationStructuredData()],
})
```
- Organization JSON-LD schema
- Canonical URL link
- Optimized for brand recognition

### Appointment Creation (`/appointments/create`)
```typescript
head: () => ({
  meta: seo({
    title: "Agendar Cita - PanaBarbero",
    description: "Busca y agenda citas con las mejores barberías cerca de ti.",
    canonical: getCanonicalUrl("/appointments/create"),
  }),
  links: [{ rel: "canonical", href: getCanonicalUrl("/appointments/create") }],
})
```
- Public booking interface
- Canonical URL prevents duplicate content
- Improves discoverability for appointment scheduling searches

### Barbershop Listing (`/barbershops`)
```typescript
head: ({ loaderData }) => {
  const location = loaderData?.deps?.city && loaderData?.deps?.state
    ? ` en ${city}, ${state}`
    : "";
  return {
    meta: seo({
      title: `Barberías${location} - PanaBarbero`,
      description: `Descubre barberías${location} en PanaBarbero...`,
      canonical: getCanonicalUrl("/barbershops"),
    }),
  };
}
```
- Dynamic titles based on city/state filter
- Improves ranking for location-based searches

### Barbershop Detail (`/barbershops/:uuid`)
```typescript
head: ({ match }) => {
  const barbershop = match.context.seoBarbershop;
  const metadata = match.context.seoMetadata;
  const reviews = match.context.seoReviews;

  return {
    meta: barbershopSeo(barbershop, metadata),
    links: [{ rel: "canonical", href: getCanonicalUrl(...) }],
    scripts: [barbershopStructuredData(barbershop, metadata, reviews)],
  };
}
```
- BarberShop structured data with ratings and reviews
- Rich snippets in search results
- Canonical URL prevents duplicate content

### Pricing Page (`/pricing`)
- Separate meta tags for plan information
- Canonical URL

### Static Pages (Privacy Policy, Terms)
- Custom meta tags for each legal page
- Canonical URLs

---

## 4. Canonical URLs

**Implemented on all public pages:**
```typescript
links: [{ rel: "canonical", href: getCanonicalUrl("/path") }]
```

**Benefits:**
- ✅ Prevents duplicate content issues
- ✅ Consolidates link equity to canonical version
- ✅ Clarifies preferred URL for search engines

---

## 5. Structured Data (JSON-LD)

### BarberShop Schema
Includes:
- Business name, description, address
- Opening hours (including lunch breaks)
- Contact information (phone, email, website)
- Aggregate rating and review count
- Individual reviews (up to 10)
- Social media links
- Price range indicator

**Benefits:**
- Rich snippets in Google Search
- Local business card in Maps
- Better visibility to LLMs and AI assistants

### Example Output
```json
{
  "@context": "https://schema.org",
  "@type": "BarberShop",
  "name": "Barbería El Corte",
  "description": "...",
  "url": "https://www.panabarbero.com/barbershops/...",
  "telephone": "+57...",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "...",
    "addressLocality": "Bogotá",
    "addressRegion": "Cundinamarca",
    "postalCode": "110111",
    "addressCountry": "CO"
  },
  "openingHoursSpecification": [...],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "25",
    "bestRating": "5",
    "worstRating": "1"
  },
  "review": [...]
}
```

---

## 6. Meta Tags Summary

### Open Graph Tags (Social Sharing)
- `og:type` - Content type (website, business.business)
- `og:title` - Page title for social media
- `og:description` - Preview description
- `og:image` - Thumbnail for sharing
- `og:url` - Canonical URL
- `og:locality`, `og:region` - Location info for barbershops

### Twitter Card Tags
- `twitter:card` - Card type (summary_large_image)
- `twitter:title` - Tweet title
- `twitter:description` - Tweet description
- `twitter:image` - Tweet image
- `twitter:creator` - @panabarbero
- `twitter:site` - @panabarbero

### Standard Meta Tags
- `title` - Page title (60 chars recommended)
- `description` - Meta description (160 chars recommended)
- `robots` - Crawl instructions (indexed on public pages)

---

## 7. Environment Handling

**Production:**
```
Domain: https://www.panabarbero.com
```

**Local/Development:**
```
Domain: http://localhost:3000
```

Both environments share the same code; domain is determined by `process.env.NODE_ENV`.

---

## 8. Crawler Behavior

### Allowed Crawlers
- Googlebot
- Bingbot
- DuckDuckGo
- Good reputation crawlers
- **Rate limit:** Standard (crawl-delay: 0)

### Rate-Limited Crawlers
- AhrefsBot
- SemrushBot
- Moz Bot
- DotBot
- **Rate limit:** 10 second delay between requests

### Blocked Crawlers
- Nmap
- sqlmap
- Other known malicious bots

---

## 9. Testing the SEO Implementation

### Verify Sitemap
```bash
curl https://www.panabarbero.com/sitemap.xml
```

### Verify Robots.txt
```bash
curl https://www.panabarbero.com/robots.txt
```

### Validate Structured Data
Use Google's Rich Results Test:
```
https://search.google.com/test/rich-results
```

### Check Meta Tags
Use browser DevTools:
```
Inspect → Head → meta tags
```

### Preview Social Sharing
- [Facebook Open Graph Debugger](https://developers.facebook.com/tools/debug/)
- [Twitter Card Validator](https://cards-dev.twitter.com/validator)

---

## 10. Best Practices Implemented

✅ **Canonical URLs** - Prevent duplicate content
✅ **Structured Data** - Help search engines understand content
✅ **Sitemaps** - Ensure all pages are discoverable
✅ **Robots.txt** - Guide crawlers appropriately
✅ **Meta Tags** - Improve CTR in search results
✅ **Social Tags** - Better sharing on social media
✅ **Responsive Design** - Already provided by TanStack Start
✅ **SSR Enabled** - Crawlers receive fully rendered HTML
✅ **Fast Performance** - TanStack Start optimized
✅ **Mobile Friendly** - Built-in Tailwind responsive

---

## 11. Next Steps (Optional Enhancements)

- [ ] Add `itemprop` markup for reviews
- [ ] Implement local business FAQPage schema
- [ ] Add appointment schema for booking pages
- [ ] Set up Google Search Console
- [ ] Monitor Core Web Vitals
- [ ] Track rankings with Nozzle.io or similar
- [ ] Implement hreflang tags for multi-language (if needed)

---

## Files Modified

| File | Changes |
|------|---------|
| `src/lib/utils.ts` | Added SEO utilities |
| `src/routes/__root.tsx` | Added canonical, sitemap reference |
| `src/routes/index.tsx` | Added head, organization schema |
| `src/routes/pricing.tsx` | Added head with canonical |
| `src/routes/barbershops/index.tsx` | Added dynamic head |
| `src/routes/barbershops/$barbershopUuid.tsx` | Added structured data |
| `src/routes/privacy-policy.tsx` | Added head with canonical |
| `src/routes/tos.tsx` | Added head with canonical |
| `src/routes/sitemap[.]xml.ts` | New dynamic sitemap |
| `src/routes/robots[.]txt.ts` | New dynamic robots.txt |

---

## Code Quality

- ✅ No bloat - Utilities are DRY and reusable
- ✅ Type-safe - Full TypeScript support
- ✅ Production-ready - Includes error handling and fallbacks
- ✅ Cached appropriately - Robots.txt (7 days), sitemap (24 hours)
- ✅ Spanish localized - All text in es-CO
- ✅ Follows TanStack Start patterns - Uses `head()` and loaders correctly
