/// <reference path="./plugins.d.ts" />
import createMarkdownIt, { type MarkdownIt, type StateCore, type Token } from "markdown-it";
import { full as emoji } from "markdown-it-emoji";
import frontMatter from "markdown-it-front-matter";
import githubAlerts from "markdown-it-github-alerts";
import taskLists from "markdown-it-task-lists";

export const LINE_START_ATTR = "data-line-start";
export const LINE_END_ATTR = "data-line-end";

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

function parseFrontMatterEntries(meta: string, firstContentLine: number) {
  return meta.split("\n").flatMap((line, index) => {
    const match = /^([^\s:#][^:]*):\s*(.*)$/.exec(line);
    if (!match) return [];
    return [{ key: match[1] ?? "", value: match[2] ?? "", line: firstContentLine + index }];
  });
}

function renderFrontMatter(md: MarkdownIt, token: Token): string {
  const escapeHtml = md.utils.escapeHtml;
  const map = token.map ?? [0, 0];
  const entries = parseFrontMatterEntries(String(token.meta ?? ""), map[0] + 2);
  const rows = entries
    .map(
      (entry) =>
        `<tr ${LINE_START_ATTR}="${entry.line}" ${LINE_END_ATTR}="${entry.line}">` +
        `<td>${escapeHtml(entry.key)}</td><td>${escapeHtml(entry.value)}</td></tr>`,
    )
    .join("");
  const start = token.attrGet(LINE_START_ATTR) ?? "";
  const end = token.attrGet(LINE_END_ATTR) ?? "";
  return `<table class="mhr-frontmatter" ${LINE_START_ATTR}="${start}" ${LINE_END_ATTR}="${end}"><tbody>${rows}</tbody></table>\n`;
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
  return md;
}
