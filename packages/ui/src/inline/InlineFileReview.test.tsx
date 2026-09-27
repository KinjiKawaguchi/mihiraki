import { createMemoryBackend, type ReviewBackend, type ReviewThread } from '@better-gh-md/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import { createThreadStore } from '../threads/thread-store';
import { InlineFileReview } from './InlineFileReview';

const files = {
  'docs/a.md': { base: 'Alpha version one.\n', head: 'Alpha version two.\n' },
  'docs/b.md': { base: 'Bravo.\n', head: 'Bravo changed.\n' },
};
const fileA = { path: 'docs/a.md', previousPath: null, changeType: 'MODIFIED' as const };

function threadOn(path: string, text: string): ReviewThread {
  return {
    id: path,
    path,
    side: 'RIGHT',
    line: 1,
    startLine: null,
    isResolved: false,
    isOutdated: false,
    comments: [{ id: path, author: 'bob', avatarUrl: '', bodyHtml: `<p>${text}</p>`, createdAt: '', url: '' }],
  };
}

function columnText(container: Element, side: 'LEFT' | 'RIGHT'): string {
  return Array.from(container.querySelectorAll(`[data-side="${side}"]`))
    .map((cell) => cell.textContent)
    .join('\n');
}

async function renderInline(backend: ReviewBackend) {
  const store = createThreadStore(backend);
  await store.refresh();
  const view = render(<InlineFileReview backend={backend} file={fileA} store={store} />);
  await waitFor(() => expect(columnText(view.container, 'RIGHT')).toContain('Alpha version two.'));
  return view;
}

describe('InlineFileReview', () => {
  it('renders one file side by side', async () => {
    const { container } = await renderInline(createMemoryBackend(files));

    expect(columnText(container, 'LEFT')).toContain('Alpha version one.');
  });

  it('shows only the threads of its own file', async () => {
    await renderInline(createMemoryBackend(files, [threadOn('docs/a.md', 'about A'), threadOn('docs/b.md', 'about B')]));

    expect(screen.getByText('about A')).toBeTruthy();
    expect(screen.queryByText('about B')).toBeNull();
  });

  it('refreshes the shared threads after posting so the new comment appears', async () => {
    const { container } = await renderInline(createMemoryBackend(files));

    fireEvent.mouseOver(container.querySelector('[data-side="RIGHT"] p') as Element);
    fireEvent.click(screen.getByRole('button', { name: 'コメントを追加' }));
    fireEvent.input(screen.getByRole('textbox'), { target: { value: 'Posted inline' } });
    fireEvent.click(screen.getByRole('button', { name: 'コメントする' }));

    expect(await screen.findByText('Posted inline')).toBeTruthy();
  });

  it('shows why the file could not be loaded', async () => {
    const backend: ReviewBackend = {
      ...createMemoryBackend(files),
      loadFileVersions: () => Promise.reject(new Error('HTTP 404')),
    };
    render(<InlineFileReview backend={backend} file={fileA} store={createThreadStore(backend)} />);

    expect(await screen.findByText(/HTTP 404/)).toBeTruthy();
  });
});
