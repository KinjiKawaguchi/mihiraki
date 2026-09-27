import { splitTextUnits } from "./text-units";

export type HtmlTokenKind = "tag" | "text";

export interface HtmlToken {
  readonly kind: HtmlTokenKind;
  /** Exact source text, emitted back when rendering. */
  readonly value: string;
  /** Comparison key. Differs from `value` only for tags carrying source line attributes. */
  readonly key: string;
}

const TAG_PATTERN = /<!--[\s\S]*?-->|<[^>]*>/g;
const LINE_ATTR_PATTERN = / data-line-(?:start|end)="[^"]*"/g;

function tokenizeText(text: string): HtmlToken[] {
  return splitTextUnits(text).map((value) => ({ kind: "text" as const, value, key: value }));
}

/** Splits HTML into tags and diff-friendly text units (words, CJK characters, whitespace). */
export function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let cursor = 0;
  for (const match of html.matchAll(TAG_PATTERN)) {
    const index = match.index ?? 0;
    tokens.push(...tokenizeText(html.slice(cursor, index)));
    tokens.push({ kind: "tag", value: match[0], key: match[0].replace(LINE_ATTR_PATTERN, "") });
    cursor = index + match[0].length;
  }
  tokens.push(...tokenizeText(html.slice(cursor)));
  return tokens;
}
