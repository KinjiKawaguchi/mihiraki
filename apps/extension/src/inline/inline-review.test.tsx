import { createMemoryBackend } from '@better-gh-md/core';
import { waitFor } from '@testing-library/preact';
import { afterEach, describe, expect, it } from 'vitest';
import { appendFileBlock } from './fixture';
import { SPLIT_TOGGLE_TAG, SPLIT_VIEW_TAG, isSplitActive } from './github-file-dom';
import { startInlineReview } from './inline-review';

const backend = createMemoryBackend({
  'docs/a.md': { base: 'Alpha version one.\n', head: 'Alpha version two.\n' },
  'docs/b.md': { base: 'Bravo.\n', head: 'Bravo changed.\n' },
});

let stop: (() => void) | null = null;

afterEach(() => {
  stop?.();
  stop = null;
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});

async function start() {
  stop = await startInlineReview({ document, backend, cssText: '' });
}

function toggleButton(container: Element): HTMLButtonElement | null {
  return container.querySelector(SPLIT_TOGGLE_TAG)?.shadowRoot?.querySelector('button') ?? null;
}

function splitViewText(container: Element): string {
  return container.querySelector(SPLIT_VIEW_TAG)?.shadowRoot?.textContent ?? '';
}

describe('startInlineReview', () => {
  it('adds a split toggle beside the view switcher of changed Markdown files only', async () => {
    const markdown = await appendFileBlock(document, 'docs/a.md');
    const code = await appendFileBlock(document, 'src/app.ts');

    await start();

    expect(markdown.querySelector('[data-component="SegmentedControl"]')?.nextElementSibling?.tagName.toLowerCase()).toBe(
      SPLIT_TOGGLE_TAG,
    );
    expect(toggleButton(code)).toBeNull();
  });

  it('replaces the diff with the rendered split view when toggled on', async () => {
    const container = await appendFileBlock(document, 'docs/a.md');
    await start();

    toggleButton(container)?.click();

    expect(isSplitActive(container)).toBe(true);
    expect(toggleButton(container)?.getAttribute('aria-pressed')).toBe('true');
    await waitFor(() => expect(splitViewText(container)).toContain('Alpha version two.'));
  });

  it('restores GitHub diff when toggled off', async () => {
    const container = await appendFileBlock(document, 'docs/a.md');
    await start();

    toggleButton(container)?.click();
    toggleButton(container)?.click();

    expect(isSplitActive(container)).toBe(false);
    expect(container.querySelector(SPLIT_VIEW_TAG)).toBeNull();
  });

  it('decorates file blocks that GitHub renders later', async () => {
    await start();

    const late = await appendFileBlock(document, 'docs/b.md');

    await waitFor(() => expect(toggleButton(late)).not.toBeNull());
  });

  it('puts the toggle back when GitHub re-renders the file header', async () => {
    const container = await appendFileBlock(document, 'docs/a.md');
    await start();

    container.querySelector(SPLIT_TOGGLE_TAG)?.remove();
    container.querySelector('.actions')?.append(document.createElement('span'));

    await waitFor(() => expect(toggleButton(container)).not.toBeNull());
  });

  it('removes every trace when stopped', async () => {
    const container = await appendFileBlock(document, 'docs/a.md');
    await start();
    toggleButton(container)?.click();

    stop?.();
    stop = null;

    expect(container.querySelector(SPLIT_TOGGLE_TAG)).toBeNull();
    expect(container.querySelector(SPLIT_VIEW_TAG)).toBeNull();
    expect(isSplitActive(container)).toBe(false);
    expect(document.head.querySelector('style')).toBeNull();
  });
});
