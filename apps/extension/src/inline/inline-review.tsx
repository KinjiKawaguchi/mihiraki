import {
  type ChangedFile,
  type HostError,
  ok,
  type Result,
  type ReviewBackend,
} from "@mihiraki/core";
import {
  createThreadStore,
  type DiagramRenderer,
  type DiffLayout,
  type Locale,
} from "@mihiraki/ui";
import type { HostSyncClient } from "../host-sync/client";
import { watchDocument } from "./document-watch";
import { fileContainerId } from "./file-anchor";
import { createFileDecorator } from "./file-decorator";
import { installPageStyle, removePageStyle, setRenderedViewActive } from "./github-file-dom";
import { INLINE_MESSAGES } from "./messages";

export interface InlineReviewOptions {
  readonly document: Document;
  readonly backend: ReviewBackend;
  /** Stylesheet of the view, injected into each view's shadow root. */
  readonly cssText: string;
  /**
   * Keeps GitHub's own UI and the views in step (threads, layout setting), when available.
   */
  readonly hostSync?: HostSyncClient;
  /** Language of everything added to the page. */
  readonly locale: Locale;
  /** GitHub's split / unified setting at start; host sync reports later changes. */
  readonly initialLayout: DiffLayout;
  /** Draws diagrams as GitHub does; without it they stay code blocks. */
  readonly renderDiagram?: DiagramRenderer;
}

/** GitHub updates several stores per comment; reload our threads once they settle. */
const HOST_REFRESH_DELAY_MS = 300;

function debounce(callback: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
}

interface HostWatch {
  readonly onThreadsChanged: () => void;
  readonly onSyncLost: () => void;
  readonly onLayoutChanged: (layout: DiffLayout) => void;
}

/** Follows GitHub's own UI: its threads, comments it could not take in, and its layout. */
function watchHost(hostSync: HostSyncClient | undefined, handlers: HostWatch): () => void {
  if (!hostSync) return () => undefined;
  const stops = [
    hostSync.onHostThreadsChanged(debounce(handlers.onThreadsChanged, HOST_REFRESH_DELAY_MS)),
    hostSync.onSyncLost(handlers.onSyncLost),
    hostSync.watchDiffLayout(handlers.onLayoutChanged),
  ];
  return () => {
    for (const stop of stops) stop();
  };
}

/** Threads are loaded when the first view is shown, not before anyone looks at them. */
function createLazyLoad(load: () => void) {
  let hasLoaded = false;
  return {
    hasLoaded: () => hasLoaded,
    loadOnce: () => {
      if (hasLoaded) return;
      hasLoaded = true;
      load();
    },
  };
}

interface FileTarget {
  readonly file: ChangedFile;
  readonly containerId: string;
}

/** Changed Markdown files paired with the id of their block on the Files changed page. */
async function locateFiles(
  backend: ReviewBackend,
): Promise<Result<readonly FileTarget[], HostError>> {
  const files = await backend.listChangedMarkdownFiles();
  if (!files.ok) return files;
  return ok(
    await Promise.all(
      files.value.map(async (file) => ({ file, containerId: await fileContainerId(file.path) })),
    ),
  );
}

type FileDecorator = ReturnType<typeof createFileDecorator>;

/** Brings every file block that is on the page in line with the current state. */
function decorateAll(document: Document, targets: readonly FileTarget[], decorator: FileDecorator) {
  for (const { file, containerId } of targets) {
    const container = document.getElementById(containerId);
    if (container) decorator.sync(container, file);
  }
}

/** Shows GitHub's own diff again in every file block. */
function restoreAll(document: Document, targets: readonly FileTarget[]) {
  for (const { containerId } of targets) {
    const container = document.getElementById(containerId);
    if (container) setRenderedViewActive(container, false);
  }
}

/**
 * Shows changed Markdown files on GitHub's Files changed page rendered, with comments,
 * whenever GitHub's own switcher shows their rich diff: split or unified as GitHub's
 * layout setting says. Returns a function that removes everything again, or why the
 * files could not be found.
 */
export async function startInlineReview(
  options: InlineReviewOptions,
): Promise<Result<() => void, HostError>> {
  const { document, backend, cssText, hostSync, locale, renderDiagram } = options;
  let layout = options.initialLayout;
  const located = await locateFiles(backend);
  if (!located.ok) return located;
  const targets = located.value;
  let isHostSynced = hostSync ? await hostSync.isHostAvailable() : false;
  const store = createThreadStore(backend);
  const threads = createLazyLoad(() => void store.refresh());

  const sync = () => decorateAll(document, targets, decorator);

  const decorator = createFileDecorator({
    document,
    backend,
    store,
    cssText,
    pendingReviewNotice: () =>
      isHostSynced ? undefined : INLINE_MESSAGES[locale].pendingReviewNotice,
    locale,
    layout: () => layout,
    onViewShown: threads.loadOnce,
    renderDiagram,
  });

  installPageStyle(document);
  sync();
  const stopWatching = watchDocument(document, sync);
  const stopHostWatch = watchHost(hostSync, {
    onThreadsChanged: () => {
      if (threads.hasLoaded()) void store.refresh();
    },
    // A comment GitHub's UI could not take in leaves its counts stale until reloaded.
    onSyncLost: () => {
      isHostSynced = false;
      sync();
    },
    onLayoutChanged: (next) => {
      layout = next;
      sync();
    },
  });

  return ok(() => {
    for (const stop of [stopWatching, stopHostWatch, decorator.dispose]) stop();
    restoreAll(document, targets);
    removePageStyle(document);
  });
}
