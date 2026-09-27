import type { Token } from "markdown-it";
import { createMarkdownRenderer, toLineRange } from "./renderer";
import type { BlockKind, SourceBlock } from "./types";

const KIND_BY_TOKEN_TYPE: Readonly<Record<string, BlockKind>> = {
  heading_open: "heading",
  paragraph_open: "paragraph",
  bullet_list_open: "list",
  ordered_list_open: "list",
  table_open: "table",
  blockquote_open: "blockquote",
  alert_open: "blockquote",
  fence: "code",
  code_block: "code",
  hr: "hr",
  html_block: "html",
  front_matter: "frontmatter",
};

const md = createMarkdownRenderer();

/** Index of the token that closes the top-level block opened at `openIndex`. */
function findBlockEnd(tokens: readonly Token[], openIndex: number): number {
  const open = tokens[openIndex];
  if (open?.nesting !== 1) return openIndex;
  let depth = 0;
  for (let i = openIndex; i < tokens.length; i += 1) {
    depth += tokens[i]?.nesting ?? 0;
    if (depth === 0) return i;
  }
  return tokens.length - 1;
}

/** Splits a Markdown document into top-level blocks with their source lines and rendered HTML. */
export function parseBlocks(source: string): SourceBlock[] {
  const env = {};
  const tokens = md.parse(source, env);
  const sourceLines = source.split("\n");
  const blocks: SourceBlock[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token?.level !== 0 || token.map === null) continue;
    const endIndex = findBlockEnd(tokens, i);
    const lines = toLineRange(token.map, sourceLines);
    blocks.push({
      kind: KIND_BY_TOKEN_TYPE[token.type] ?? "other",
      lines,
      source: sourceLines.slice(lines.start - 1, lines.end).join("\n"),
      html: md.renderer.render(tokens.slice(i, endIndex + 1), md.options, env),
    });
    i = endIndex;
  }
  return blocks;
}
