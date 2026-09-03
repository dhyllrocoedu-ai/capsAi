import { useMemo } from "react";
import { markdownToHtml } from "@/lib/markdown";

/**
 * Renders Markdown from a trusted source (the AI) as styled HTML.
 * Only use this with assistant/AI-generated content — never user input.
 */
export function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    let out = content;
    // Convert fenced code blocks to styled <pre><code> before table/para parsing
    out = out.replace(
      /```(\w+)?\n([\s\S]*?)```/g,
      (_m, lang: string | undefined, code: string) => {
        const langAttr = lang ? ` data-language="${lang}"` : "";
        return `<pre class="md-code-block"><code${langAttr}>${code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`;
      },
    );
    return markdownToHtml(out);
  }, [content]);

  return <div className="md-prose" dangerouslySetInnerHTML={{ __html: html }} />;
}
