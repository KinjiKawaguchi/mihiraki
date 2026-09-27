import type { ChangedFile, ReviewBackend } from '@better-gh-md/core';
import { createThreadStore, InlineFileReview } from '@better-gh-md/ui';
import { render } from 'preact';
import { fileContainerId } from './file-anchor';
import {
  findHeader,
  findViewSwitcher,
  installPageStyle,
  removePageStyle,
  setSplitActive,
  SPLIT_TOGGLE_TAG,
  SPLIT_VIEW_TAG,
} from './github-file-dom';
import { createShadowHost, type ShadowHost } from './shadow-host';
import { SPLIT_TOGGLE_CSS, SplitToggle } from './SplitToggle';

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

/** GitHub mutates the page constantly; batch our reaction to it. */
const SYNC_DELAY_MS = 50;

function unmount(shadow: ShadowHost | undefined): void {
  if (!shadow) return;
  render(null, shadow.mount);
  shadow.host.remove();
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
  const toggles = new Map<string, ShadowHost>();
  const views = new Map<string, ShadowHost>();
  let activePaths: ReadonlySet<string> = new Set();
  let hasRequestedThreads = false;

  const setActive = (path: string, isActive: boolean) => {
    activePaths = new Set([...activePaths].filter((active) => active !== path).concat(isActive ? [path] : []));
    if (isActive && !hasRequestedThreads) {
      hasRequestedThreads = true;
      void store.refresh();
    }
    sync();
  };

  const syncToggle = (container: HTMLElement, { file }: FileTarget) => {
    let toggle = toggles.get(file.path);
    if (!toggle || !container.contains(toggle.host)) {
      const switcher = findViewSwitcher(container);
      const header = findHeader(container);
      if (!switcher && !header) return;
      unmount(toggle);
      toggle = createShadowHost(document, SPLIT_TOGGLE_TAG, SPLIT_TOGGLE_CSS);
      if (switcher) switcher.after(toggle.host);
      else header?.append(toggle.host);
      toggles.set(file.path, toggle);
    }
    const isActive = activePaths.has(file.path);
    render(<SplitToggle isActive={isActive} onToggle={() => setActive(file.path, !isActive)} />, toggle.mount);
  };

  const syncView = (container: HTMLElement, { file }: FileTarget) => {
    const view = views.get(file.path);
    const isActive = activePaths.has(file.path);
    setSplitActive(container, isActive);
    if (!isActive) {
      unmount(view);
      views.delete(file.path);
      return;
    }
    if (view && container.contains(view.host)) return;
    unmount(view);
    const created = createShadowHost(document, SPLIT_VIEW_TAG, cssText);
    container.append(created.host);
    render(<InlineFileReview backend={backend} file={file} store={store} />, created.mount);
    views.set(file.path, created);
  };

  function sync() {
    for (const target of targets) {
      const container = document.getElementById(target.containerId);
      if (!container) continue;
      syncToggle(container, target);
      syncView(container, target);
    }
  }

  let isSyncScheduled = false;
  const observer = new MutationObserver(() => {
    if (isSyncScheduled) return;
    isSyncScheduled = true;
    setTimeout(() => {
      isSyncScheduled = false;
      sync();
    }, SYNC_DELAY_MS);
  });

  installPageStyle(document);
  sync();
  observer.observe(document.body, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    [...toggles.values(), ...views.values()].forEach(unmount);
    targets.forEach((target) => {
      const container = document.getElementById(target.containerId);
      if (container) setSplitActive(container, false);
    });
    removePageStyle(document);
  };
}
