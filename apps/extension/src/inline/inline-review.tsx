import type { ChangedFile, ReviewBackend } from "@mihiraki/core";
import { createThreadStore } from "@mihiraki/ui";
import type { HostSyncClient } from "../host-sync/client";
import { watchDocument } from "./document-watch";
import { fileContainerId } from "./file-anchor";
import { createFileDecorator } from "./file-decorator";
import { installPageStyle, removePageStyle, setSplitActive } from "./github-file-dom";

export interface InlineReviewOptions {
  readonly document: Document;
  readonly backend: ReviewBackend;
  /** Stylesheet of the split view, injected into each view's shadow root. */
  readonly cssText: string;
  /** Keeps GitHub's own UI and the split views showing the same threads, when available. */
  readonly hostSync?: HostSyncClient;
}

/**
 * Without host sync, GitHub's "Submit review" counter does not notice comments added
 * from here until the page is reloaded, although submitting still includes them.
 */
const PENDING_REVIEW_NOTICE =
  "保留中のコメントは GitHub の「Submit review」から提出できます。件数に反映されていなければ再読み込みしてください。";

/** GitHub updates several stores per comment; reload our threads once they settle. */
const HOST_REFRESH_DELAY_MS = 300;

function debounce(callback: () => void, delayMs: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(callback, delayMs);
  };
}

/** Reloads our threads (once they were requested) whenever GitHub's own threads change. */
function followHostThreads(hostSync: HostSyncClient | undefined, refresh: () => void): () => void {
  return (
    hostSync?.onHostThreadsChanged(debounce(refresh, HOST_REFRESH_DELAY_MS)) ?? (() => undefined)
  );
}

interface FileTarget {
  readonly file: ChangedFile;
  readonly containerId: string;
}

/** Changed Markdown files paired with the id of their block on the Files changed page. */
async function locateFiles(backend: ReviewBackend): Promise<readonly FileTarget[]> {
  const files = await backend.listChangedMarkdownFiles();
  return Promise.all(
    files.map(async (file) => ({ file, containerId: await fileContainerId(file.path) })),
  );
}

/**
 * Adds a "split" toggle to every changed Markdown file on GitHub's Files changed page
 * and swaps the file's diff for the rendered split review while it is on.
 * Returns a function that removes everything again.
 */
export async function startInlineReview({
  document,
  backend,
  cssText,
  hostSync,
}: InlineReviewOptions): Promise<() => void> {
  const targets = await locateFiles(backend);
  const isHostSynced = hostSync ? await hostSync.isHostAvailable() : false;
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
    pendingReviewNotice: isHostSynced ? undefined : PENDING_REVIEW_NOTICE,
    isActive: (path) => activePaths.has(path),
    setActive: (path, isActive) => {
      activePaths = new Set(
        [...activePaths].filter((active) => active !== path).concat(isActive ? [path] : []),
      );
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
  const stopHostWatch = followHostThreads(hostSync, () => {
    if (hasRequestedThreads) void store.refresh();
  });

  return () => {
    stopWatching();
    stopHostWatch();
    decorator.dispose();
    targets.forEach(({ containerId }) => {
      const container = document.getElementById(containerId);
      if (container) setSplitActive(container, false);
    });
    removePageStyle(document);
  };
}
