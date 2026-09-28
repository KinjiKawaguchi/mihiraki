/**
 * Access to the Zustand stores behind GitHub's Files changed page, for keeping GitHub's
 * own UI (pending review count, thread markers) in step with comments posted from here.
 * Runs in the page's main world. Everything here relies on GitHub internals observed on
 * github.com (2026-09) and fails closed: when something is missing nothing is changed.
 */
import type { DiffLayout } from "@mihiraki/ui";
import { parseDiffLayout } from "../github/diff-layout";
import { asRecord, asString } from "../github/json";
import { type CheckedHostChange, diffLineKeyOf, threadSubjectOf } from "./protocol";

export interface ZustandStore {
  getState(): unknown;
  setState(partial: Record<string, unknown>): void;
  subscribe(listener: (state: unknown, previous: unknown) => void): () => void;
}

export interface ReviewStores {
  /** Store of PullRequestStoreProvider: per-file diff summaries and their thread markers. */
  readonly page: ZustandStore;
  /** Store of LayoutStoreProvider: threads, pending review and conversation counts. */
  readonly layout: ZustandStore;
}

interface Fiber {
  readonly type?: unknown;
  readonly return?: Fiber | null;
  readonly child?: Fiber | null;
  readonly memoizedProps?: Readonly<Record<string, unknown>> | null;
}

type Action = (...args: unknown[]) => unknown;

const DIFF_HEADER_SELECTOR = "[data-diff-header-wrapper]";
const PAGE_STORE_PROVIDER = "PullRequestStoreProvider";
const LAYOUT_STORE_PROVIDER = "LayoutStoreProvider";
const PROVIDER_SEARCH_DEPTH = 6;

function isStore(value: unknown): value is ZustandStore {
  const record = asRecord(value);
  return (
    !!record &&
    ["getState", "setState", "subscribe"].every((name) => typeof record[name] === "function")
  );
}

function fiberOf(element: Element): Fiber | null {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  return key ? ((element as unknown as Record<string, Fiber | undefined>)[key] ?? null) : null;
}

function componentName(fiber: Fiber): string | null {
  const { type } = fiber;
  if (typeof type === "function")
    return (type as { displayName?: string }).displayName ?? type.name;
  const displayName = asRecord(type)?.displayName;
  return typeof displayName === "string" ? displayName : null;
}

/** A provider renders its context provider just below itself; the store is its value. */
function storeBelow(provider: Fiber): ZustandStore | null {
  let child = provider.child ?? null;
  for (let depth = 0; child && depth < PROVIDER_SEARCH_DEPTH; depth += 1) {
    const value = child.memoizedProps?.value;
    if (isStore(value)) return value;
    child = child.child ?? null;
  }
  return null;
}

export function findReviewStores(document: Document): ReviewStores | null {
  const header = document.querySelector(DIFF_HEADER_SELECTOR);
  let fiber = header ? fiberOf(header) : null;
  let page: ZustandStore | null = null;
  let layout: ZustandStore | null = null;
  while (fiber && !(page && layout)) {
    const name = componentName(fiber);
    if (name === PAGE_STORE_PROVIDER) page = storeBelow(fiber);
    if (name === LAYOUT_STORE_PROVIDER) layout = storeBelow(fiber);
    fiber = fiber.return ?? null;
  }
  return page && layout ? { page, layout } : null;
}

function actionOf(state: unknown, slice: string, name: string): Action | null {
  const action = asRecord(asRecord(state)?.[slice])?.[name];
  return typeof action === "function" ? (action as Action) : null;
}

type CheckedChangeOf<K extends CheckedHostChange["kind"]> = Extract<
  CheckedHostChange,
  { readonly kind: K }
>;

/** Replays the store updates GitHub performs after its own comment form posts a comment. */
export function registerCreatedThread(
  stores: ReviewStores,
  message: CheckedChangeOf<"threadCreated">,
): boolean {
  const layout = stores.layout.getState();
  const addPendingComment = actionOf(layout, "pendingReviewActions", "addPendingComment");
  const updateThread = actionOf(layout, "markersActions", "updateThread");
  const incrementUnresolved = actionOf(
    layout,
    "markerCountsActions",
    "incrementUnresolvedConversationCount",
  );
  const onCommentThreadAdded = actionOf(
    stores.page.getState(),
    "diffSummariesActions",
    "onCommentThreadAdded",
  );
  const isReview = message.mode === "review";
  if (!updateThread || !onCommentThreadAdded || (isReview && !addPendingComment)) return false;

  const { path } = message.target;
  const { threadId } = message;
  const diffLineKey = diffLineKeyOf(message.target);
  const subject = threadSubjectOf(message.target);
  try {
    if (isReview) addPendingComment?.(threadId);
    updateThread(threadId, path, diffLineKey, () => ({
      ...message.thread,
      subject,
      positioning: subject,
      shouldRenderInDiffLines: true,
    }));
    onCommentThreadAdded({ path, diffLineKey, threadID: String(threadId) });
    incrementUnresolved?.();
    return true;
  } catch {
    return false;
  }
}

/** Replays the store updates GitHub performs after its own reply box posts a comment. */
function registerReply(stores: ReviewStores, change: CheckedChangeOf<"threadReplied">): boolean {
  const layout = stores.layout.getState();
  const addPendingComment = actionOf(layout, "pendingReviewActions", "addPendingComment");
  const updateThread = actionOf(layout, "markersActions", "updateThread");
  const isReview = change.mode === "review";
  if (!updateThread || (isReview && !addPendingComment)) return false;
  try {
    if (isReview) addPendingComment?.(change.threadId);
    updateThread(
      change.threadId,
      change.target.path,
      diffLineKeyOf(change.target),
      (previous: unknown) => ({ ...asRecord(previous), ...change.thread }),
    );
    return true;
  } catch {
    return false;
  }
}

/** Replays the store updates GitHub performs after its own Resolve / Unresolve buttons. */
function registerResolution(
  stores: ReviewStores,
  change: CheckedChangeOf<"threadResolved">,
  viewerLogin: string | null,
): boolean {
  const layout = stores.layout.getState();
  const updateThread = actionOf(layout, "markersActions", "updateThread");
  const updateCount = actionOf(
    layout,
    "markerCountsActions",
    change.isResolved
      ? "decrementUnresolvedConversationCount"
      : "incrementUnresolvedConversationCount",
  );
  if (!updateThread) return false;
  const resolution = {
    isResolved: change.isResolved,
    resolvedBy: change.isResolved ? (viewerLogin ?? undefined) : undefined,
    resolutionReason: undefined,
  };
  try {
    updateThread(
      change.threadId,
      change.target.path,
      diffLineKeyOf(change.target),
      (previous: unknown) => {
        const thread = asRecord(previous);
        return thread ? { ...thread, ...resolution } : undefined;
      },
    );
    updateCount?.();
    return true;
  } catch {
    return false;
  }
}

/**
 * Shows a change made through GitHub's endpoints in GitHub's own UI; false when it cannot.
 * `viewerLogin` is who resolves a thread, as GitHub records it.
 */
export function applyHostChange(
  stores: ReviewStores,
  change: CheckedHostChange,
  viewerLogin: string | null,
): boolean {
  switch (change.kind) {
    case "threadCreated":
      return registerCreatedThread(stores, change);
    case "threadReplied":
      return registerReply(stores, change);
    case "threadResolved":
      return registerResolution(stores, change, viewerLogin);
  }
}

/** The signed-in viewer's login, from the client environment GitHub embeds in every page. */
export function viewerLoginOf(document: Document): string | null {
  const json = document.getElementById("client-env")?.textContent;
  if (!json) return null;
  try {
    return asString(asRecord(JSON.parse(json))?.login);
  } catch {
    return null;
  }
}

/** Calls `onChange` whenever GitHub's threads or pending review change, whoever changed them. */
export function watchReviewThreads(stores: ReviewStores, onChange: () => void): () => void {
  return stores.layout.subscribe((state, previous) => {
    const next = asRecord(state);
    const before = asRecord(previous);
    if (next?.markers !== before?.markers || next?.pendingReview !== before?.pendingReview)
      onChange();
  });
}

function diffLayoutOf(pageState: unknown): DiffLayout | null {
  return parseDiffLayout(asRecord(asRecord(pageState)?.viewSettings)?.splitPreference);
}

/** The viewer's split / unified setting, as GitHub's page store currently holds it. */
export function readDiffLayout(stores: ReviewStores): DiffLayout | null {
  return diffLayoutOf(stores.page.getState());
}

/** Calls `onChange` whenever the viewer switches between split and unified. */
export function watchDiffLayout(
  stores: ReviewStores,
  onChange: (layout: DiffLayout) => void,
): () => void {
  return stores.page.subscribe((state, previous) => {
    const layout = diffLayoutOf(state);
    if (layout !== null && layout !== diffLayoutOf(previous)) onChange(layout);
  });
}
