/// <reference path="./plugins.d.ts" />
import createMarkdownIt, { type MarkdownIt, type StateCore, type Token } from "markdown-it";
import { full as emoji } from "markdown-it-emoji";
import frontMatter from "markdown-it-front-matter";
import githubAlerts from "markdown-it-github-alerts";
import taskLists from "markdown-it-task-lists";

export const LINE_START_ATTR = "data-line-start";
export const LINE_END_ATTR = "data-line-end";
/** Marks a diagram's placeholder, valued with the diagram's language. */
export const DIAGRAM_ATTR = "data-mhr-diagram";

/** Languages of fenced blocks that hosts can draw as diagrams. */
const DIAGRAM_LANGUAGES: ReadonlySet<string> = new Set(["mermaid"]);

/**
 * The diagram language of a top-level fence, else null. Nested fences stay code: a
 * diagram is compared as a whole, which only a block of its own allows.
 */
export function diagramLanguageOf(token: Token): string | null {
  if (token.type !== "fence" || token.level !== 0) return null;
  const language = token.info.trim().split(/\s+/)[0] ?? "";
  return DIAGRAM_LANGUAGES.has(language) ? language : null;
}

/**
 * markdown-it maps are 0-based and end-exclusive. Converts to a 1-based inclusive
 * range and drops trailing blank lines so the range only covers visible content.
 */
export function toLineRange(map: readonly [number, number], sourceLines: readonly string[]) {
  const start = map[0] + 1;
  let end = Math.max(start, map[1]);
  while (end > start && (sourceLines[end - 1] ?? "").trim() === "") {
    end -= 1;
  }
  return { start, end };
}

function isAnnotatable(token: Token): boolean {
  return token.block && token.map !== null && token.type !== "inline" && token.nesting !== -1;
}

function annotateLines(state: StateCore): void {
  const sourceLines = state.src.split("\n");
  for (const token of state.tokens) {
    if (!isAnnotatable(token) || token.map === null) continue;
    const range = toLineRange(token.map, sourceLines);
    token.attrSet(LINE_START_ATTR, String(range.start));
    token.attrSet(LINE_END_ATTR, String(range.end));
  }
}

const FRONT_MATTER_ENTRY = /^([^\s:#][^:]*):\s*(.*)$/;

interface FrontMatterEntry {
  readonly key: string;
  readonly value: string;
  /** Source line, or null when the front matter's position is unknown. */
  readonly line: number | null;
}

function parseFrontMatterEntries(meta: string, firstContentLine: number | null) {
  return meta.split("\n").flatMap((line, index): FrontMatterEntry[] => {
    const [, key, value] = FRONT_MATTER_ENTRY.exec(line) ?? [];
    if (key === undefined || value === undefined) return [];
    return [{ key, value, line: firstContentLine === null ? null : firstContentLine + index }];
  });
}

/** Source line attributes, left out when the lines are unknown so nothing points at wrong ones. */
function lineAttrs(start: number | string | null, end: number | string | null): string {
  return start === null || end === null
    ? ""
    : ` ${LINE_START_ATTR}="${start}" ${LINE_END_ATTR}="${end}"`;
}

function renderFrontMatter(md: MarkdownIt, token: Token): string {
  const escapeHtml = md.utils.escapeHtml;
  // The entries start on the line after the opening `---`.
  const firstContentLine = token.map ? token.map[0] + 2 : null;
  const rows = parseFrontMatterEntries(String(token.meta ?? ""), firstContentLine)
    .map(
      (entry) =>
        `<tr${lineAttrs(entry.line, entry.line)}>` +
        `<td>${escapeHtml(entry.key)}</td><td>${escapeHtml(entry.value)}</td></tr>`,
    )
    .join("");
  const tableLines = lineAttrs(token.attrGet(LINE_START_ATTR), token.attrGet(LINE_END_ATTR));
  return `<table class="mhr-frontmatter"${tableLines}><tbody>${rows}</tbody></table>\n`;
}

/** GitHub-flavoured markdown-it instance that annotates block elements with source lines. */
export function createMarkdownRenderer(): MarkdownIt {
  const md = createMarkdownIt({ html: true, linkify: true, typographer: false })
    .use(frontMatter, () => undefined)
    .use(githubAlerts)
    .use(taskLists, { enabled: false })
    .use(emoji);
  md.core.ruler.push("mhr_line_attrs", annotateLines);
  md.renderer.rules.front_matter = (tokens, idx) => {
    const token = tokens[idx];
    return token ? renderFrontMatter(md, token) : "";
  };
  const renderFence = md.renderer.rules.fence;
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const code = renderFence?.(tokens, idx, options, env, self) ?? "";
    const token = tokens[idx];
    const language = token ? diagramLanguageOf(token) : null;
    if (!token || language === null) return code;
    const lines = lineAttrs(token.attrGet(LINE_START_ATTR), token.attrGet(LINE_END_ATTR));
    return `<div class="mhr-diagram" ${DIAGRAM_ATTR}="${language}"${lines}>${code}</div>\n`;
  };
  return md;
}
