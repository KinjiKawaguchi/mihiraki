/**
 * Extensions GitHub renders as Markdown and offers a rich diff for: linguist's Markdown
 * extensions, plus .mdx and .litcoffee, which github/markup also renders as Markdown.
 * Checked on a pull request with one file per candidate; .mdtxt, .mdtext and .text got
 * no rich diff.
 */
const MARKDOWN_EXTENSIONS: ReadonlySet<string> = new Set([
  "md",
  "markdown",
  "mdown",
  "mkdn",
  "mkd",
  "mdwn",
  "mkdown",
  "livemd",
  "ronn",
  "scd",
  "workbook",
  "mdx",
  "litcoffee",
]);

export function isMarkdownPath(path: string): boolean {
  const extension = /\.([^./]+)$/.exec(path)?.[1]?.toLowerCase();
  return extension !== undefined && MARKDOWN_EXTENSIONS.has(extension);
}
