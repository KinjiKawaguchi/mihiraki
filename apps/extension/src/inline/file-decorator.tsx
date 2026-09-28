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

function unmount(view: ShadowHost | undefined): void {
  if (!view) return;
  render(null, view.mount);
  view.host.remove();
}

function renderView(context: FileDecoratorContext, host: ShadowHost, file: ChangedFile) {
  const notice = context.pendingReviewNotice();
  const layout = context.layout();
  render(
    <InlineFileReview
      backend={context.backend}
      file={file}
      store={context.store}
      pendingReviewNotice={notice}
      locale={context.locale}
      layout={layout}
      renderDiagram={context.renderDiagram}
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
 * the rendered view replaces it; with the source diff, GitHub's diff is left as it is.
 */
function syncView(
  context: FileDecoratorContext,
  views: ViewsByPath,
  container: HTMLElement,
  file: ChangedFile,
) {
  const view = views.get(file.path);
  const isShown = isRichDiffShown(container);
  setRenderedViewActive(container, isShown);
  if (!isShown) {
    unmount(view);
    views.delete(file.path);
    return;
  }
  if (view && container.contains(view.host)) {
    // Rendering again keeps the view's state; only needed when its inputs changed.
    if (!isUpToDate(context, view)) views.set(file.path, renderView(context, view, file));
    return;
  }
  unmount(view);
  const created = createShadowHost(context.document, REVIEW_VIEW_TAG, context.cssText);
  container.append(created.host);
  views.set(file.path, renderView(context, created, file));
  context.onViewShown();
}

/** Puts the rendered view in place of GitHub's rich diff for changed Markdown files. */
export function createFileDecorator(context: FileDecoratorContext) {
  const views: ViewsByPath = new Map();
  return {
    sync: (container: HTMLElement, file: ChangedFile) => syncView(context, views, container, file),
    dispose: () => {
      for (const view of views.values()) unmount(view);
      views.clear();
    },
  };
}
