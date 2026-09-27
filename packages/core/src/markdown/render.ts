import { createMarkdownRenderer } from './renderer';

const md = createMarkdownRenderer();

/** Renders a standalone Markdown text, such as a comment being written, the way documents are rendered. */
export function renderMarkdown(source: string): string {
  return md.render(source);
}
