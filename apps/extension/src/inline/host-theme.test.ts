import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { inheritHostThemeColors } from './host-theme';

const require = createRequire(join(process.cwd(), '../../packages/ui/package.json'));
const githubMarkdownCss = readFileSync(require.resolve('github-markdown-css/github-markdown.css'), 'utf8');

describe('inheritHostThemeColors', () => {
  it('drops the colour variables github-markdown-css picks from the OS setting', () => {
    const css = inheritHostThemeColors(githubMarkdownCss);

    expect(githubMarkdownCss).toMatch(/--bgColor-default:\s*#/);
    expect(css).not.toMatch(/--bgColor-default:\s*#/);
    expect(css).not.toContain('prefers-color-scheme');
  });

  it('keeps the rules that use those variables', () => {
    const css = inheritHostThemeColors(githubMarkdownCss);

    expect(css).toContain('.markdown-body h1');
    expect(css).toContain('var(--fgColor-default)');
  });

  it('handles minified output', () => {
    const minified =
      '@media (prefers-color-scheme:dark){.markdown-body,[data-theme=dark]{color-scheme:dark;--fgColor-default:#fff}}.x{color:red}';

    expect(inheritHostThemeColors(minified)).toBe('.x{color:red}');
  });

  it('leaves other colour-scheme rules alone', () => {
    const own = '@media (prefers-color-scheme:dark){.bgm-root{--bgm-bg:var(--bgColor-default,#0d1117)}}';

    expect(inheritHostThemeColors(own)).toBe(own);
  });
});
