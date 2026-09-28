/** 1-based, inclusive range of source lines. */
export interface LineRange {
  readonly start: number;
  readonly end: number;
}

export type BlockKind =
  | "heading"
  | "paragraph"
  | "list"
  | "table"
  | "blockquote"
  | "code"
  /** A fenced block a host can draw, e.g. a mermaid chart; its code is the fallback. */
  | "diagram"
  | "hr"
  | "html"
  | "frontmatter"
  | "other";

/** A top-level Markdown block together with where it came from in the source. */
export interface SourceBlock {
  readonly kind: BlockKind;
  readonly lines: LineRange;
  readonly source: string;
  /** Rendered HTML. Nested block elements carry `data-line-start` / `data-line-end`. */
  readonly html: string;
}
