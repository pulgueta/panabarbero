import { createFileRoute } from "@tanstack/react-router";

import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { Markdown } from "@/components/markdown";
import privacyContent from "@/content/privacy-policy.md?raw";
import { renderMarkdown } from "@/utils/markdown";
import { getCanonicalUrl, seo } from "@/lib/utils";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({
    meta: seo({
      title: "Política de Privacidad - PanaBarbero",
      description:
        "Lee nuestra política de privacidad para entender cómo protegemos tus datos.",
      canonical: getCanonicalUrl("/privacy-policy"),
    }),
    links: [{ rel: "canonical", href: getCanonicalUrl("/privacy-policy") }],
  }),
  loader: async () => {
    const markup = await renderMarkdown(privacyContent);

    return { markup };
  },
  pendingComponent: LoadingComponent,
  component: PrivacyPolicyPage,
});

function PrivacyPolicyPage() {
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
