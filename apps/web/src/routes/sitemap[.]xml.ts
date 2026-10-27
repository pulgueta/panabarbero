import { createFileRoute } from "@tanstack/react-router";

import { getBaseUrl } from "@/lib/utils";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const baseUrl = getBaseUrl();

          const staticPages = [
            { loc: "/", changefreq: "daily", priority: 1.0 },
            { loc: "/ai", changefreq: "weekly", priority: 0.8 },
            { loc: "/pricing", changefreq: "weekly", priority: 0.8 },
            { loc: "/privacy-policy", changefreq: "monthly", priority: 0.5 },
            { loc: "/tos", changefreq: "monthly", priority: 0.5 },
          ];

          const urls = [
            ...staticPages.map((page) => ({
              loc: `${baseUrl}${page.loc}`,
              changefreq: page.changefreq,
              priority: page.priority,
            })),
          ];

          const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${escapeXml(url.loc)}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

          return new Response(sitemap, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
              "Cache-Control": "public, max-age=86400",
            },
          });
        } catch {
          const baseUrl = getBaseUrl();

          const staticPages = [
            { loc: "/", changefreq: "daily", priority: 1.0 },
            { loc: "/ai", changefreq: "weekly", priority: 0.8 },
            { loc: "/pricing", changefreq: "weekly", priority: 0.8 },
            { loc: "/privacy-policy", changefreq: "monthly", priority: 0.5 },
            { loc: "/tos", changefreq: "monthly", priority: 0.5 },
          ];

          const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticPages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.loc}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>`;

          return new Response(sitemap, {
            headers: {
              "Content-Type": "application/xml; charset=utf-8",
            },
          });
        }
      },
    },
  },
});

function escapeXml(str: string): string {
  return str.replace(/[<>&'"]/g, (char) => {
    switch (char) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return char;
    }
  });
}
