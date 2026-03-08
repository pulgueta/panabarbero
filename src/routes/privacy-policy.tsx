import { createFileRoute } from "@tanstack/react-router";

import { Markdown } from "@/components/markdown";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { renderMarkdown } from "@/utils/markdown";
import privacyContent from "@/content/privacy-policy.md?raw";

export const Route = createFileRoute("/privacy-policy")({
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
				className="prose prose-neutral dark:prose-invert mx-auto max-w-3xl"
			/>
		</BorderContainer>
	);
}
