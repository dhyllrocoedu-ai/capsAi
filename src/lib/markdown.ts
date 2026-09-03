/**
 * Lightweight Markdown -> HTML converter tuned for AI-generated
 * academic drafts. Supports the constructs the AI is instructed to emit:
 * headings, paragraphs, bold/italic, bullet & ordered lists, blockquotes,
 * tables, and [FIGURE: ...] placeholders.
 */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(text: string): string {
  let out = escapeHtml(text);
  // Bold **text**
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text* (avoid matching inside <strong>)
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  // Inline code `code`
  out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
  return out;
}

function parseTable(lines: string[]): string {
  if (lines.length < 2) return "";
  const header = lines[0]
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => inline(c.trim()));
  const cells = lines
    .slice(2)
    .filter((l) => l.trim().startsWith("|"))
    .map((line) =>
      line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((c) => inline(c.trim())),
    );

  let html = "<table><thead><tr>";
  for (const h of header) html += `<th><p>${h || "&nbsp;"}</p></th>`;
  html += "</tr></thead><tbody>";
  for (const row of cells) {
    html += "<tr>";
    for (const c of row) html += `<td><p>${c || "&nbsp;"}</p></td>`;
    html += "</tr>";
  }
  html += "</tbody></table>";
  return html;
}

/**
 * Converts AI Markdown output to sanitized HTML for the TipTap editor.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return "";

  const blocks = markdown.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;

  const closeLists = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };

  for (const rawBlock of blocks) {
    const lines = rawBlock.split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) continue;

    const first = lines[0];

    // Fenced code block (already converted to <pre> by caller) — pass through unescaped
    if (first.startsWith("<pre")) {
      closeLists();
      html.push(rawBlock);
      continue;
    }

    // Figure placeholder
    if (/^\[FIGURE:.*\]$/.test(first.trim())) {
      closeLists();
      const caption = first.trim().replace(/^\[FIGURE:\s*/, "").replace(/\]$/, "");
      html.push(
        `<div data-type="figurePlaceholder" class="figure-placeholder"><p>▦ FIGURE PLACEHOLDER</p><p class="figure-caption">${escapeHtml(caption)}</p></div>`,
      );
      continue;
    }

    // Table
    if (first.includes("|") && lines.some((l) => l.trim().startsWith("|"))) {
      closeLists();
      html.push(parseTable(lines));
      continue;
    }

    // Headings
    const heading = first.match(/^(#{1,3})\s+(.*)$/);
    if (heading && lines.length === 1) {
      closeLists();
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }

    // Bullet list
    if (first.match(/^[-*]\s+/)) {
      if (listType !== "ul") {
        closeLists();
        html.push("<ul>");
        listType = "ul";
      }
      for (const line of lines) {
        const content = line.replace(/^[-*]\s+/, "");
        html.push(`<li><p>${inline(content)}</p></li>`);
      }
      continue;
    }

    // Ordered list
    if (first.match(/^\d+\.\s+/)) {
      if (listType !== "ol") {
        closeLists();
        html.push("<ol>");
        listType = "ol";
      }
      for (const line of lines) {
        const content = line.replace(/^\d+\.\s+/, "");
        html.push(`<li><p>${inline(content)}</p></li>`);
      }
      continue;
    }

    // Blockquote
    if (first.startsWith(">")) {
      closeLists();
      html.push(`<blockquote><p>${inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "))}</p></blockquote>`);
      continue;
    }

    // Paragraph (join line breaks into a single paragraph)
    closeLists();
    html.push(`<p>${inline(lines.join(" "))}</p>`);
  }

  closeLists();
  return html.join("\n");
}
