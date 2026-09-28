import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import {
  type DiagramRenderer,
  type DiffLayout,
  InlineFileReview,
  type Locale,
  type ThreadStore,
} from "@mihiraki/ui";
import { render } from "preact";
import { isRichDiffShown, REVIEW_VIEW_TAG, setRenderedViewActive } from "./github-file-dom";
import { INLINE_MESSAGES } from "./messages";
import { createShadowHost, type ShadowHost } from "./shadow-host";

export interface FileDecoratorContext {
  readonly document: Document;
  readonly backend: ReviewBackend;
  readonly store: ThreadStore;
  readonly cssText: string;
  readonly locale: Locale;
  /** Shown in the views while a review is pending; none while GitHub's UI is kept in sync. */
  readonly pendingReviewNotice: () => string | undefined;
  /** GitHub's split / unified setting, which the views follow. */
  readonly layout: () => DiffLayout;
  /** Called whenever a file starts showing the rendered view. */
  readonly onViewShown: () => void;
  /** Draws diagrams as GitHub does; without it they stay code blocks. */
  readonly renderDiagram?: DiagramRenderer;
}

interface RenderedView extends ShadowHost {
  /** What it was rendered with, so it is rendered again only when that changes. */
  readonly notice: string | undefined;
  readonly layout: DiffLayout;
}

type ViewsByPath = Map<string, RenderedView>;

/**
 * Files the viewer chose to see in GitHub's own rich diff. The choice lasts until the file
 * shows the source diff, so switching back to the rich diff brings the rendered view again.
 */
function createHostViewChoices() {
  let paths: ReadonlySet<string> = new Set();
  return {
    has: (path: string) => paths.has(path),
    choose: (path: string) => {
      paths = new Set([...paths, path]);
    },
    forget: (path: string) => {
      if (paths.has(path)) paths = new Set([...paths].filter((chosen) => chosen !== path));
    },
  };
}

type HostViewChoices = ReturnType<typeof createHostViewChoices>;

interface DecoratorState {
  readonly views: ViewsByPath;
  readonly hostViewChoices: HostViewChoices;
}

function unmount(view: ShadowHost | undefined): void {
  if (!view) return;
  render(null, view.mount);
  view.host.remove();
}

function renderView(
  context: FileDecoratorContext,
  host: ShadowHost,
  file: ChangedFile,
  onShowGitHubView: () => void,
) {
  const notice = context.pendingReviewNotice();
  const layout = context.layout();
  const t = INLINE_MESSAGES[context.locale];
  render(
    <InlineFileReview
      backend={context.backend}
      file={file}
      store={context.store}
      pendingReviewNotice={notice}
      locale={context.locale}
      layout={layout}
      renderDiagram={context.renderDiagram}
      hostViewSwitch={{
        label: t.showGitHubView,
        description: t.showGitHubViewDescription,
        onSelect: onShowGitHubView,
      }}
    />,
    host.mount,
  );
  return { ...host, notice, layout };
}

function isUpToDate(context: FileDecoratorContext, view: RenderedView): boolean {
  return view.notice === context.pendingReviewNotice() && view.layout === context.layout();
}

/**
 * Keeps one file block in line with GitHub's own switcher: while it shows the rich diff,
 * the rendered view replaces it (unless the viewer chose GitHub's own for this file); with
 * the source diff, GitHub's diff is left as it is.
 */
function syncView(
  context: FileDecoratorContext,
  state: DecoratorState,
  container: HTMLElement,
  file: ChangedFile,
) {
  const { views, hostViewChoices } = state;
  const view = views.get(file.path);
  const isRichDiff = isRichDiffShown(container);
  if (!isRichDiff) hostViewChoices.forget(file.path);
  const isShown = isRichDiff && !hostViewChoices.has(file.path);
  setRenderedViewActive(container, isShown);
  if (!isShown) {
    unmount(view);
    views.delete(file.path);
    return;
  }
  const showGitHubView = () => {
    hostViewChoices.choose(file.path);
    syncView(context, state, container, file);
  };
  if (view && container.contains(view.host)) {
    // Rendering again keeps the view's state; only needed when its inputs changed.
    if (!isUpToDate(context, view))
      views.set(file.path, renderView(context, view, file, showGitHubView));
    return;
  }
  unmount(view);
  const created = createShadowHost(context.document, REVIEW_VIEW_TAG, context.cssText);
  container.append(created.host);
  views.set(file.path, renderView(context, created, file, showGitHubView));
  context.onViewShown();
}

/** Puts the rendered view in place of GitHub's rich diff for changed Markdown files. */
export function createFileDecorator(context: FileDecoratorContext) {
  const state: DecoratorState = { views: new Map(), hostViewChoices: createHostViewChoices() };
  return {
    sync: (container: HTMLElement, file: ChangedFile) => syncView(context, state, container, file),
    dispose: () => {
      for (const view of state.views.values()) unmount(view);
      state.views.clear();
    },
  };
}
