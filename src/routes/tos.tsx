import { createFileRoute } from "@tanstack/react-router";

import { Markdown } from "@/components/markdown";
import { BorderContainer } from "@/components/layout/border-container";
import { LoadingComponent } from "@/components/layout/loading-component";
import { renderMarkdown } from "@/utils/markdown";
import tosContent from "@/content/tos.md?raw";

export const Route = createFileRoute("/tos")({
	loader: async () => {
		const markup = await renderMarkdown(tosContent);
		return { markup };
	},
	pendingComponent: LoadingComponent,
	component: TermsOfServicePage,
});

function TermsOfServicePage() {
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
