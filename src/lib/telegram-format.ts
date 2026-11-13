/**
 * Markdown-ish model output -> Telegram HTML.
 *
 * Telegram only accepts a small HTML subset (<b>, <i>, <code>, <pre>, <a>,
 * <blockquote>) and rejects the whole message when a tag is malformed, so the
 * conversion is deliberately conservative: anything that is not a supported tag
 * stays as escaped text. `stripTags` gives the plain-text fallback used when
 * Telegram still refuses the entities.
 */

export function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function stripTags(html: string): string {
  return String(html ?? "")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function inline(segment: string): string {
  let out = escapeHtml(segment);

  // [label](https://link) -> <a href="…">label</a>
  out = out.replace(
    /\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a href="$2">$1</a>',
  );
  // `code`
  out = out.replace(/`([^`\n]+)`/g, "<code>$1</code>");
  // **bold**
  out = out.replace(/\*\*([^*\n]+)\*\*/g, "<b>$1</b>");
  // headings
  out = out.replace(/^#{1,6}\s+(.+)$/gm, "<b>$1</b>");
  // *italic* (never inside a word, so snake_case survives)
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, "$1<i>$2</i>");
  // bullet lists
  out = out.replace(/^[-*]\s+/gm, "• ");
  // horizontal rules
  out = out.replace(/^\s*---+\s*$/gm, "──────────");

  return out;
}

export function toTelegramHtml(input: string): string {
  const text = String(input ?? "");
  const chunks = text.split("```");
  let out = "";

  chunks.forEach((chunk, index) => {
    if (index % 2 === 1) {
      // Inside a fenced block: keep it verbatim, drop the language hint.
      const body = chunk.replace(/^[A-Za-z0-9_+#-]*\n?/, "").replace(/\n+$/, "");
      out += chunk.trim() ? `<pre>${escapeHtml(body)}</pre>` : "";
      return;
    }
    out += inline(chunk);
  });

  // Telegram renders long runs of blank lines poorly.
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
