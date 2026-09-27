/**
 * Access to the Zustand stores behind GitHub's Files changed page, for keeping GitHub's
 * own UI (pending review count, thread markers) in step with comments posted from here.
 * Runs in the page's main world. Everything here relies on GitHub internals observed on
 * github.com (2026-09) and fails closed: when something is missing nothing is changed.
 */
import { asRecord } from "../github/json";
import { diffLineKeyOf, type ThreadCreatedMessage, threadSubjectOf } from "./protocol";

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

/** Replays the store updates GitHub performs after its own comment form posts a comment. */
export function registerCreatedThread(
  stores: ReviewStores,
  message: ThreadCreatedMessage,
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
  const threadId = Number(message.thread.id);
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

/** Calls `onChange` whenever GitHub's threads or pending review change, whoever changed them. */
export function watchReviewThreads(stores: ReviewStores, onChange: () => void): () => void {
  return stores.layout.subscribe((state, previous) => {
    const next = asRecord(state);
    const before = asRecord(previous);
    if (next?.markers !== before?.markers || next?.pendingReview !== before?.pendingReview)
      onChange();
  });
}
