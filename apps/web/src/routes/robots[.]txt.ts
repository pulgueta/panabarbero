import { createFileRoute } from "@tanstack/react-router";

import { getBaseUrl } from "@/lib/utils";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () => {
        const baseUrl = getBaseUrl();

        const robots = `# PanaBarbero robots.txt

# Block aggressive/malicious bots
User-agent: AhrefsBot
User-agent: SemrushBot
User-agent: DotBot
User-agent: MJ12bot
User-agent: Nmap
User-agent: sqlmap
Disallow: /

# All other crawlers
User-agent: *
Allow: /
Disallow: /profile
Disallow: /appointments
Disallow: /invitations
Disallow: /*?*
Disallow: /_*

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
