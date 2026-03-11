import { createFileRoute } from "@tanstack/react-router";

import { getBaseUrl } from "@/lib/utils";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = getBaseUrl();

        // Common user agents with most restrictive rules for efficiency
        const robots = `# PanaBarbero robots.txt
# Last updated: ${new Date().toISOString()}

# All user agents
User-agent: *
Allow: /

# Disallow authenticated/private routes
Disallow: /profile
Disallow: /appointments
Disallow: /invitations
Disallow: /*?*  # Query parameters can cause duplicate content
Disallow: /_*   # Internal routes

# Rate limiting for aggressive crawlers
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: DotBot
User-agent: MJ12bot
Crawl-delay: 10
Request-rate: 1/10s

# Respect standard crawlers with reasonable speed
User-agent: Googlebot
User-agent: Bingbot
Crawl-delay: 0
Request-rate: unlimited

# Block bad bots
User-agent: MJ12bot
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: DotBot
User-agent: Nmap
User-agent: sqlmap
Disallow: /

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml
`;

        return new Response(robots, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "public, max-age=604800",
          },
        });
      },
    },
  },
});
