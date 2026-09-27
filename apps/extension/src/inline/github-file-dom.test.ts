import { afterEach, describe, expect, it } from 'vitest';
import { appendFileBlock } from './fixture';
import { findViewSwitcher, installPageStyle, isSplitActive, setSplitActive } from './github-file-dom';

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

describe('github file DOM', () => {
  it('finds the source / rich diff switcher in the file header', async () => {
    const container = await appendFileBlock(document, 'a.md');

    expect(findViewSwitcher(container)?.getAttribute('aria-label')).toBe('File view');
  });

  it('marks a file as split without touching GitHub-managed children', async () => {
    const container = await appendFileBlock(document, 'a.md');

    setSplitActive(container, true);
    expect(isSplitActive(container)).toBe(true);
    setSplitActive(container, false);

    expect(isSplitActive(container)).toBe(false);
    expect(container.querySelector('.diff-body')?.getAttribute('style')).toBeNull();
  });

  it('installs one page style that hides the original diff body of split files', () => {
    installPageStyle(document);
    installPageStyle(document);

    const styles = document.head.querySelectorAll('style[data-bgm-page-style]');
    expect(styles).toHaveLength(1);
    expect(styles[0]?.textContent).toContain('[data-bgm-split]');
    expect(styles[0]?.textContent).toContain(':not([data-diff-header-wrapper])');
  });
});
