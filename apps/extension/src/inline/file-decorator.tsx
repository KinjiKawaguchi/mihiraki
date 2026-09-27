import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import { InlineFileReview, type ThreadStore } from "@mihiraki/ui";
import { render } from "preact";
import {
  findHeader,
  findViewSwitcher,
  SPLIT_TOGGLE_TAG,
  SPLIT_VIEW_TAG,
  setSplitActive,
} from "./github-file-dom";
import { SPLIT_TOGGLE_CSS, SplitToggle } from "./SplitToggle";
import { createShadowHost, type ShadowHost } from "./shadow-host";

export interface FileDecoratorContext {
  readonly document: Document;
  readonly backend: ReviewBackend;
  readonly store: ThreadStore;
  readonly cssText: string;
  /** Shown in split views while a review is pending; none while GitHub's UI is kept in sync. */
  readonly pendingReviewNotice: () => string | undefined;
  readonly isActive: (path: string) => boolean;
  readonly setActive: (path: string, isActive: boolean) => void;
}

function unmount(shadow: ShadowHost | undefined): void {
  if (!shadow) return;
  render(null, shadow.mount);
  shadow.host.remove();
}

type HostsByPath = Map<string, ShadowHost>;

interface SplitView extends ShadowHost {
  /** The notice it was rendered with, so it is rendered again only when that changes. */
  readonly notice: string | undefined;
}

type ViewsByPath = Map<string, SplitView>;

function syncToggle(
  context: FileDecoratorContext,
  toggles: HostsByPath,
  container: HTMLElement,
  file: ChangedFile,
) {
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
  render(
    <SplitToggle isActive={isOn} onToggle={() => context.setActive(file.path, !isOn)} />,
    toggle.mount,
  );
}

function renderView(context: FileDecoratorContext, host: ShadowHost, file: ChangedFile) {
  const notice = context.pendingReviewNotice();
  render(
    <InlineFileReview
      backend={context.backend}
      file={file}
      store={context.store}
      pendingReviewNotice={notice}
    />,
    host.mount,
  );
  return { ...host, notice };
}

function syncView(
  context: FileDecoratorContext,
  views: ViewsByPath,
  container: HTMLElement,
  file: ChangedFile,
) {
  const view = views.get(file.path);
  const isOn = context.isActive(file.path);
  setSplitActive(container, isOn);
  if (!isOn) {
    unmount(view);
    views.delete(file.path);
    return;
  }
  if (view && container.contains(view.host)) {
    // Rendering again keeps the view's state; only needed when the notice changed.
    if (view.notice !== context.pendingReviewNotice())
      views.set(file.path, renderView(context, view, file));
    return;
  }
  unmount(view);
  const created = createShadowHost(context.document, SPLIT_VIEW_TAG, context.cssText);
  container.append(created.host);
  views.set(file.path, renderView(context, created, file));
}

/** Keeps the split toggle and (when on) the split view attached to GitHub's file blocks. */
export function createFileDecorator(context: FileDecoratorContext) {
  const toggles: HostsByPath = new Map();
  const views: ViewsByPath = new Map();
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
