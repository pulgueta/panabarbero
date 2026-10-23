type MarkdownProps = {
  content: string;
  className?: string;
};

export function Markdown({ content, className }: MarkdownProps) {
  // Server-rendered markdown content from trusted local .md files; safe to render as HTML.
  return (
    <div
      className={className}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
}
