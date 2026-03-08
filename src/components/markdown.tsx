type MarkdownProps = {
	content: string;
	className?: string;
};

export function Markdown({ content, className }: MarkdownProps) {
	return (
		<div
			className={className}
			// biome-ignore lint/security/noDangerouslySetInnerHtml: static markdown content
			dangerouslySetInnerHTML={{ __html: content }}
		/>
	);
}
