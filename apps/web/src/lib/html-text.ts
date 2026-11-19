/** Tags that start a new line of text (paragraphs, list items, headings, line breaks…). */
const BLOCK_TAG = /<\/?(?:p|div|li|ul|ol|br|hr|h[1-6]|tr|td|th|table|section|article|blockquote|pre)\b[^>]*>/gi;
const ANY_TAG = /<[^>]*>/g;
const DROPPED_BLOCK = /<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi;

const NAMED_ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  bull: "•",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const code =
        entity[1] === "x" || entity[1] === "X"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(code) && code > 0 ? String.fromCodePoint(code) : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

/**
 * Convert rich-text HTML (from the job editor) into plain text.
 * Block-level tags become line breaks so list items and paragraphs stay separate;
 * every other tag is removed and HTML entities are decoded. Works on the server
 * (no DOM needed) and leaves plain text unchanged apart from entity decoding.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return "";
  return decodeEntities(
    html.replace(DROPPED_BLOCK, " ").replace(BLOCK_TAG, "\n").replace(ANY_TAG, ""),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n[\s]*/g, "\n")
    .trim();
}
