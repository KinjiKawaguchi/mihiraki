import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import {
  type DiagramRenderer,
  type DiffLayout,
  InlineFileReview,
  type Locale,
  type ThreadStore,
} from "@mihiraki/ui";
import { render } from "preact";
import {
  insertBelowHeader,
  isRichDiffShown,
  RETURN_BAR_TAG,
  REVIEW_VIEW_TAG,
  setRenderedViewActive,
  viewSlotOf,
} from "./github-file-dom";
import { githubImageSource, imageKeyOf } from "./github-images";
import { INLINE_MESSAGES } from "./messages";
import { createShadowHost, type ShadowHost } from "./shadow-host";

export interface FileDecoratorContext {
  readonly document: Document;
  readonly backend: ReviewBackend;
  readonly store: ThreadStore;
  readonly cssText: string;
  /** Language of the views, which follow its changes. */
  readonly locale: () => Locale;
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
  readonly locale: Locale;
  /** GitHub's proxied images in the file block when rendered; images switch to them as they arrive. */
  readonly imageKey: string;
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
  /** The strips leading back to the rendered view, for files showing GitHub's own rich diff. */
  readonly returnBars: Map<string, ShadowHost>;
}

function ReturnBar({
  label,
  description,
  onSelect,
}: {
  readonly label: string;
  readonly description: string;
  readonly onSelect: () => void;
}) {
  return (
    <div class="mhr-root mhr-inline">
      <div class="mhr-inline__bar">
        <button
          type="button"
          class="mhr-button mhr-button--small"
          title={description}
          onClick={onSelect}
        >
          {label}
        </button>
      </div>
    </div>
  );
}

/** Shows the strip back to the rendered view while the viewer has chosen GitHub's own rich diff. */
function syncReturnBar(
  context: FileDecoratorContext,
  state: DecoratorState,
  container: HTMLElement,
  file: ChangedFile,
  isWanted: boolean,
) {
  const bar = state.returnBars.get(file.path);
  if (!isWanted) {
    unmount(bar);
    state.returnBars.delete(file.path);
    return;
  }
  if (bar && container.contains(bar.host)) return;
  unmount(bar);
  const created = createShadowHost(context.document, RETURN_BAR_TAG, context.cssText);
  insertBelowHeader(container, created.host);
  const t = INLINE_MESSAGES[context.locale()];
  const showMihirakiView = () => {
    state.hostViewChoices.forget(file.path);
    syncView(context, state, container, file);
  };
  render(
    <ReturnBar
      label={t.showMihirakiView}
      description={t.showMihirakiViewDescription}
      onSelect={showMihirakiView}
    />,
    created.mount,
  );
  state.returnBars.set(file.path, created);
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
  container: HTMLElement,
  onShowGitHubView: () => void,
) {
  const notice = context.pendingReviewNotice();
  const layout = context.layout();
  const locale = context.locale();
  const imageKey = imageKeyOf(container);
  const t = INLINE_MESSAGES[locale];
  render(
    <InlineFileReview
      backend={context.backend}
      file={file}
      store={context.store}
      pendingReviewNotice={notice}
      locale={locale}
      layout={layout}
      renderDiagram={context.renderDiagram}
      imageSource={githubImageSource(container)}
      hostViewSwitch={{
        label: t.showGitHubView,
        description: t.showGitHubViewDescription,
        onSelect: onShowGitHubView,
      }}
    />,
    host.mount,
  );
  return { ...host, notice, layout, locale, imageKey };
}

function isUpToDate(
  context: FileDecoratorContext,
  view: RenderedView,
  container: HTMLElement,
): boolean {
  return (
    view.notice === context.pendingReviewNotice() &&
    view.layout === context.layout() &&
    view.locale === context.locale() &&
    view.imageKey === imageKeyOf(container)
  );
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
  syncReturnBar(context, state, container, file, isRichDiff && !isShown);
  if (!isShown) {
    // Hidden, not removed: switching back to the rich diff shows it at once, as it was left.
    if (view) view.host.hidden = true;
    return;
  }
  const showGitHubView = () => {
    hostViewChoices.choose(file.path);
    syncView(context, state, container, file);
  };
  if (view && container.contains(view.host)) {
    view.host.hidden = false;
    // Rendering again keeps the view's state; only needed when its inputs changed.
    if (!isUpToDate(context, view, container))
      views.set(file.path, renderView(context, view, file, container, showGitHubView));
    return;
  }
  unmount(view);
  const created = createShadowHost(context.document, REVIEW_VIEW_TAG, context.cssText);
  viewSlotOf(container).append(created.host);
  views.set(file.path, renderView(context, created, file, container, showGitHubView));
  context.onViewShown();
}

/** Puts the rendered view in place of GitHub's rich diff for changed Markdown files. */
export function createFileDecorator(context: FileDecoratorContext) {
  const state: DecoratorState = {
    views: new Map(),
    hostViewChoices: createHostViewChoices(),
    returnBars: new Map(),
  };
  return {
    sync: (container: HTMLElement, file: ChangedFile) => syncView(context, state, container, file),
    dispose: () => {
      for (const view of [...state.views.values(), ...state.returnBars.values()]) unmount(view);
      state.views.clear();
      state.returnBars.clear();
    },
  };
}
