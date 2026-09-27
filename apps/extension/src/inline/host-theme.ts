/**
 * github-markdown-css defines its colour variables on `.markdown-body` according to the
 * OS colour scheme. On github.com the page already defines the same Primer variables
 * for the theme the user picked (including dimmed / high-contrast / colour-blind), and
 * they inherit into our shadow roots, so those blocks only get in the way.
 */
const MARKDOWN_THEME_BLOCK =
  /@media\s*\(prefers-color-scheme:\s*(?:dark|light)\)\s*\{\s*\.markdown-body,\s*\[data-theme=["']?(?:dark|light)["']?\]\s*\{[^{}]*\}\s*\}/g;

export function inheritHostThemeColors(css: string): string {
  return css.replace(MARKDOWN_THEME_BLOCK, '');
}
