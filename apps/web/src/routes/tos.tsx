import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Markdown } from "@/components/markdown";
import tosContent from "@/content/tos.md?raw";
import { getCanonicalUrl, seo } from "@/lib/utils";
import { renderMarkdown } from "@/utils/markdown";

export const Route = createFileRoute("/tos")({
  ssr: true,
  loader: async () => {
    const markup = await renderMarkdown(tosContent);

    return { markup };
  },
  head: () => ({
    meta: seo({
      title: "Términos de Servicio - PanaBarbero",
      description:
        "Lee nuestros términos de servicio y condiciones de uso de PanaBarbero.",
      canonical: getCanonicalUrl("/tos"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/tos") }],
  }),
  headers: () => ({
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
  }),
  pendingComponent: LoadingComponent,
  component: TermsOfServicePage,
});

function TermsOfServicePage() {
  const { markup } = Route.useLoaderData();

  return (
    <BorderContainer>
      <Markdown
        content={markup}
        className="prose prose-neutral dark:prose-invert mx-auto max-w-prose"
      />
    </BorderContainer>
  );
}
