import type { ChangedFile, ReviewBackend } from '@better-gh-md/core';
import { createThreadStore } from '@better-gh-md/ui';
import { watchDocument } from './document-watch';
import { fileContainerId } from './file-anchor';
import { createFileDecorator } from './file-decorator';
import { installPageStyle, removePageStyle, setSplitActive } from './github-file-dom';

export interface InlineReviewOptions {
  readonly document: Document;
  readonly backend: ReviewBackend;
  /** Stylesheet of the split view, injected into each view's shadow root. */
  readonly cssText: string;
}

interface FileTarget {
  readonly file: ChangedFile;
  readonly containerId: string;
}

/**
 * Adds a "split" toggle to every changed Markdown file on GitHub's Files changed page
 * and swaps the file's diff for the rendered split review while it is on.
 * Returns a function that removes everything again.
 */
export async function startInlineReview({ document, backend, cssText }: InlineReviewOptions): Promise<() => void> {
  const files = await backend.listChangedMarkdownFiles();
  const targets: readonly FileTarget[] = await Promise.all(
    files.map(async (file) => ({ file, containerId: await fileContainerId(file.path) })),
  );
  const store = createThreadStore(backend);
  let activePaths: ReadonlySet<string> = new Set();
  let hasRequestedThreads = false;

  const sync = () => {
    for (const { file, containerId } of targets) {
      const container = document.getElementById(containerId);
      if (container) decorator.sync(container, file);
    }
  };

  const decorator = createFileDecorator({
    document,
    backend,
    store,
    cssText,
    isActive: (path) => activePaths.has(path),
    setActive: (path, isActive) => {
      activePaths = new Set([...activePaths].filter((active) => active !== path).concat(isActive ? [path] : []));
      if (isActive && !hasRequestedThreads) {
        hasRequestedThreads = true;
        void store.refresh();
      }
      sync();
    },
  });

  installPageStyle(document);
  sync();
  const stopWatching = watchDocument(document, sync);

  return () => {
    stopWatching();
    decorator.dispose();
    targets.forEach(({ containerId }) => {
      const container = document.getElementById(containerId);
      if (container) setSplitActive(container, false);
    });
    removePageStyle(document);
  };
}
