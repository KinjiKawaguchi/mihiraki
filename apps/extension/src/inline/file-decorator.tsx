import type { ChangedFile, ReviewBackend } from '@better-gh-md/core';
import { InlineFileReview, type ThreadStore } from '@better-gh-md/ui';
import { render } from 'preact';
import { findHeader, findViewSwitcher, setSplitActive, SPLIT_TOGGLE_TAG, SPLIT_VIEW_TAG } from './github-file-dom';
import { createShadowHost, type ShadowHost } from './shadow-host';
import { SPLIT_TOGGLE_CSS, SplitToggle } from './SplitToggle';

/**
 * GitHub's own "Submit review" counter does not notice comments added from here until
 * the page is reloaded, although submitting still includes them.
 */
const PENDING_REVIEW_NOTICE =
  '保留中のコメントは GitHub の「Submit review」から提出できます。件数に反映されていなければ再読み込みしてください。';

export interface FileDecoratorContext {
  readonly document: Document;
  readonly backend: ReviewBackend;
  readonly store: ThreadStore;
  readonly cssText: string;
  readonly isActive: (path: string) => boolean;
  readonly setActive: (path: string, isActive: boolean) => void;
}

function unmount(shadow: ShadowHost | undefined): void {
  if (!shadow) return;
  render(null, shadow.mount);
  shadow.host.remove();
}

type HostsByPath = Map<string, ShadowHost>;

function syncToggle(context: FileDecoratorContext, toggles: HostsByPath, container: HTMLElement, file: ChangedFile) {
  let toggle = toggles.get(file.path);
  if (!toggle || !container.contains(toggle.host)) {
    const switcher = findViewSwitcher(container);
    const header = findHeader(container);
    if (!switcher && !header) return;
    unmount(toggle);
    toggle = createShadowHost(context.document, SPLIT_TOGGLE_TAG, SPLIT_TOGGLE_CSS);
    if (switcher) switcher.after(toggle.host);
    else header?.append(toggle.host);
    toggles.set(file.path, toggle);
  }
  const isOn = context.isActive(file.path);
  render(<SplitToggle isActive={isOn} onToggle={() => context.setActive(file.path, !isOn)} />, toggle.mount);
}

function syncView(context: FileDecoratorContext, views: HostsByPath, container: HTMLElement, file: ChangedFile) {
  const view = views.get(file.path);
  const isOn = context.isActive(file.path);
  setSplitActive(container, isOn);
  if (!isOn) {
    unmount(view);
    views.delete(file.path);
    return;
  }
  if (view && container.contains(view.host)) return;
  unmount(view);
  const created = createShadowHost(context.document, SPLIT_VIEW_TAG, context.cssText);
  container.append(created.host);
  render(
    <InlineFileReview
      backend={context.backend}
      file={file}
      store={context.store}
      pendingReviewNotice={PENDING_REVIEW_NOTICE}
    />,
    created.mount,
  );
  views.set(file.path, created);
}

/** Keeps the split toggle and (when on) the split view attached to GitHub's file blocks. */
export function createFileDecorator(context: FileDecoratorContext) {
  const toggles: HostsByPath = new Map();
  const views: HostsByPath = new Map();
  return {
    sync: (container: HTMLElement, file: ChangedFile) => {
      syncToggle(context, toggles, container, file);
      syncView(context, views, container, file);
    },
    dispose: () => {
      [...toggles.values(), ...views.values()].forEach(unmount);
      toggles.clear();
      views.clear();
    },
  };
}
