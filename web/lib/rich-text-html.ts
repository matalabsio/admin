"use client";

const BLOCK_BREAK_CLOSE = /<\/(p|div|li|h1|h2|h3|h4|h5|h6|blockquote)>/gi;
const BLOCK_OPEN = /<(p|div|ul|ol|li|h1|h2|h3|h4|h5|h6|blockquote)[^>]*>/gi;

type Marks = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
};

const PASTE_BLOCK_TAGS = new Set([
  "p",
  "div",
  "section",
  "article",
  "header",
  "footer",
  "aside",
  "blockquote",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
]);

const PASTE_SKIP_TAGS = new Set([
  "script",
  "style",
  "meta",
  "link",
  "noscript",
  "head",
  "title",
]);

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\r/g, "").replace(/\u00a0/g, " ");
}

function markdownInlineToHtml(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_\n]+)__/g, "<u>$1</u>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
}

function plainToHtml(text: string): string {
  const normalized = normalizeWhitespace(text);
  const chunks = normalized
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (chunks.length === 0) return "<p></p>";
  return chunks
    .map((part) => {
      const withInline = markdownInlineToHtml(escapeHtml(part));
      const withBreaks = withInline.replace(/\n/g, "<br />");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

function parseInlineStyle(style: string): {
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
} {
  const parsed: {
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
  } = {};

  for (const part of style.split(";")) {
    const colon = part.indexOf(":");
    if (colon === -1) continue;
    const key = part.slice(0, colon).trim().toLowerCase();
    const value = part.slice(colon + 1).trim().toLowerCase();
    if (key === "font-weight") parsed.fontWeight = value;
    if (key === "font-style") parsed.fontStyle = value;
    if (key === "text-decoration" || key === "text-decoration-line") {
      parsed.textDecoration = value;
    }
  }

  return parsed;
}

function isBoldWeight(weight: string): boolean {
  if (weight === "bold" || weight === "bolder") return true;
  if (weight === "normal" || weight === "lighter") return false;
  const numeric = Number.parseInt(weight, 10);
  return !Number.isNaN(numeric) && numeric >= 600;
}

function nextMarks(element: HTMLElement, marks: Marks): Marks {
  const tag = element.tagName.toLowerCase();
  const parsed = parseInlineStyle(element.getAttribute("style") || "");

  let bold = marks.bold;
  let italic = marks.italic;
  let underline = marks.underline;

  // Docs/Word often wrap the whole paste in <b style="font-weight:normal">.
  // Explicit inline styles must override inherited marks from ancestors.
  if (parsed.fontWeight !== undefined) {
    bold = isBoldWeight(parsed.fontWeight);
  } else if (tag === "strong" || tag === "b") {
    bold = true;
  }

  if (parsed.fontStyle !== undefined) {
    italic = parsed.fontStyle === "italic" || parsed.fontStyle === "oblique";
  } else if (tag === "em" || tag === "i") {
    italic = true;
  }

  if (parsed.textDecoration !== undefined) {
    underline = parsed.textDecoration.includes("underline");
  } else if (tag === "u" || tag === "ins") {
    underline = true;
  }

  return { bold, italic, underline };
}

function wrapWithMarks(text: string, marks: Marks): string {
  if (!text) return "";
  let out = escapeHtml(text.replace(/\u00a0/g, " "));
  if (marks.underline) out = `<u>${out}</u>`;
  if (marks.italic) out = `<em>${out}</em>`;
  if (marks.bold) out = `<strong>${out}</strong>`;
  return out;
}

class PasteHtmlBuilder {
  paragraphs: string[] = [];
  current = "";

  pushInline(html: string) {
    this.current += html;
  }

  flushParagraph() {
    const trimmed = this.current.replace(/\s+/g, " ").trim();
    if (!trimmed) {
      this.current = "";
      return;
    }
    this.paragraphs.push(`<p>${this.current}</p>`);
    this.current = "";
  }

  build(): string {
    this.flushParagraph();
    return this.paragraphs.join("");
  }
}

function walkPasteNode(node: Node, marks: Marks, builder: PasteHtmlBuilder): void {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = (node.textContent || "").replace(/\u00a0/g, " ");
    if (!text) return;
    if (!text.trim()) {
      if (builder.current.length > 0 && !builder.current.endsWith(" ")) {
        builder.pushInline(" ");
      }
      return;
    }
    builder.pushInline(wrapWithMarks(text, marks));
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  if (PASTE_SKIP_TAGS.has(tag)) return;

  if (tag === "br") {
    builder.pushInline("<br />");
    return;
  }

  const isBlock = PASTE_BLOCK_TAGS.has(tag);
  if (isBlock) builder.flushParagraph();

  const marksForChildren = nextMarks(el, marks);
  for (const child of Array.from(el.childNodes)) {
    walkPasteNode(child, marksForChildren, builder);
  }

  if (isBlock) builder.flushParagraph();
}

/** Convert Docs/Word clipboard HTML (CSS spans) into semantic HTML for TipTap. */
function convertStyledClipboardHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const builder = new PasteHtmlBuilder();
  for (const child of Array.from(doc.body.childNodes)) {
    walkPasteNode(child, { bold: false, italic: false, underline: false }, builder);
  }
  return builder.build();
}

function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const allowed = new Set([
    "p",
    "br",
    "strong",
    "em",
    "u",
    "b",
    "i",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
  ]);
  const remove = new Set(["script", "style", "iframe", "object", "embed", "svg", "math"]);

  const walk = (node: Node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (remove.has(tag)) {
      el.remove();
      return;
    }

    if (!allowed.has(tag)) {
      const parent = el.parentNode;
      if (!parent) return;
      while (el.firstChild) parent.insertBefore(el.firstChild, el);
      parent.removeChild(el);
      return;
    }

    for (const attr of Array.from(el.attributes)) {
      el.removeAttribute(attr.name);
    }

    const children = Array.from(el.childNodes);
    for (const child of children) walk(child);
  };

  const roots = Array.from(doc.body.childNodes);
  for (const child of roots) walk(child);

  return doc.body.innerHTML.trim();
}

export function normalizeClipboardToRichHtml({
  html,
  text,
}: {
  html: string;
  text: string;
}): string {
  const plain = text.trim();
  if (!html.trim()) {
    return toCanonicalRichHtml(plain);
  }

  try {
    const converted = convertStyledClipboardHtml(html);
    const safe = sanitizeHtml(converted);
    if (safe && richHtmlToPlainText(safe).length > 0) {
      return safe;
    }
  } catch {
    /* fall through */
  }

  return toCanonicalRichHtml(plain || html);
}

export function toCanonicalRichHtml(raw: string): string {
  const source = raw.trim();
  if (!source) return "<p></p>";
  const hasTag = /<\/?[a-z][\s\S]*>/i.test(source);
  const needsStyleConversion =
    hasTag &&
    (/<span[\s>]/i.test(source) ||
      /\sstyle\s*=/i.test(source) ||
      /<meta[\s>]/i.test(source));
  const candidate = needsStyleConversion
    ? convertStyledClipboardHtml(source)
    : hasTag
      ? source
      : plainToHtml(source);
  const safe = sanitizeHtml(candidate);
  return safe || "<p></p>";
}

export function htmlToLegacyPreviewText(input: string): string {
  const source = normalizeWhitespace(input);
  if (!source) return "";
  if (!/<\/?[a-z][\s\S]*>/i.test(source)) return source;

  let text = source
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_BREAK_CLOSE, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(BLOCK_OPEN, "")
    .replace(/<(strong|b)>([\s\S]*?)<\/(strong|b)>/gi, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/(em|i)>/gi, "*$2*")
    .replace(/<u>([\s\S]*?)<\/u>/gi, "__$1__")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

  text = text
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

export function richHtmlToPlainText(input: string): string {
  return htmlToLegacyPreviewText(input)
    .replace(/\*\*([^*\n]+)\*\*/g, "$1")
    .replace(/__([^_\n]+)__/g, "$1")
    .replace(/\*([^*\n]+)\*/g, "$1")
    .trim();
}

export function hasRichTextContent(input: string): boolean {
  return richHtmlToPlainText(input).length > 0;
}
