import {
  type ChangedFile,
  type HostError,
  ok,
  type Result,
  type ReviewBackend,
} from "@mihiraki/core";
import { createThreadStore, type Locale } from "@mihiraki/ui";
import type { HostSyncClient } from "../host-sync/client";
import { watchDocument } from "./document-watch";
import { fileContainerId } from "./file-anchor";
import { createFileDecorator } from "./file-decorator";
import { installPageStyle, removePageStyle, setSplitActive } from "./github-file-dom";
import { INLINE_MESSAGES } from "./messages";

export interface InlineReviewOptions {
  readonly document: Document;
  readonly backend: ReviewBackend;
  /** Stylesheet of the split view, injected into each view's shadow root. */
  readonly cssText: string;
  /** Keeps GitHub's own UI and the split views showing the same threads, when available. */
  readonly hostSync?: HostSyncClient;
  /** Language of everything added to the page. */
  readonly locale: Locale;
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
}

/** Follows GitHub's own UI: changes to its threads, and comments it could not take in. */
function watchHost(hostSync: HostSyncClient | undefined, handlers: HostWatch): () => void {
  if (!hostSync) return () => undefined;
  const stopThreads = hostSync.onHostThreadsChanged(
    debounce(handlers.onThreadsChanged, HOST_REFRESH_DELAY_MS),
  );
  const stopLoss = hostSync.onSyncLost(handlers.onSyncLost);
  return () => {
    stopThreads();
    stopLoss();
  };
}

/** Which files show the split view; switching the first one on calls `onFirstActivation`. */
function createActivation(onFirstActivation: () => void) {
  let activePaths: ReadonlySet<string> = new Set();
  let hasActivated = false;
  return {
    isActive: (path: string) => activePaths.has(path),
    hasActivated: () => hasActivated,
    set: (path: string, isActive: boolean) => {
      activePaths = new Set(
        [...activePaths].filter((active) => active !== path).concat(isActive ? [path] : []),
      );
      if (isActive && !hasActivated) {
        hasActivated = true;
        onFirstActivation();
      }
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
    if (container) setSplitActive(container, false);
  }
}

/**
 * Adds a "split" toggle to every changed Markdown file on GitHub's Files changed page
 * and swaps the file's diff for the rendered split review while it is on.
 * Returns a function that removes everything again, or why the files could not be found.
 */
export async function startInlineReview(
  options: InlineReviewOptions,
): Promise<Result<() => void, HostError>> {
  const { document, backend, cssText, hostSync, locale } = options;
  const located = await locateFiles(backend);
  if (!located.ok) return located;
  const targets = located.value;
  let isHostSynced = hostSync ? await hostSync.isHostAvailable() : false;
  const store = createThreadStore(backend);
  const activation = createActivation(() => void store.refresh());

  const sync = () => decorateAll(document, targets, decorator);

  const decorator = createFileDecorator({
    document,
    backend,
    store,
    cssText,
    pendingReviewNotice: () =>
      isHostSynced ? undefined : INLINE_MESSAGES[locale].pendingReviewNotice,
    locale,
    isActive: activation.isActive,
    setActive: (path, isActive) => {
      activation.set(path, isActive);
      sync();
    },
  });

  installPageStyle(document);
  sync();
  const stopWatching = watchDocument(document, sync);
  const stopHostWatch = watchHost(hostSync, {
    onThreadsChanged: () => {
      if (activation.hasActivated()) void store.refresh();
    },
    // A comment GitHub's UI could not take in leaves its counts stale until reloaded.
    onSyncLost: () => {
      isHostSynced = false;
      sync();
    },
  });

  return ok(() => {
    for (const stop of [stopWatching, stopHostWatch, decorator.dispose]) stop();
    restoreAll(document, targets);
    removePageStyle(document);
  });
}
