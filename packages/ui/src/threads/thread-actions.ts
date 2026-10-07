import type {
  CommentMode,
  HostError,
  PostCommentError,
  Result,
  ReviewBackend,
  ReviewThread,
} from "@mihiraki/core";
import { createContext } from "preact";
import { useContext } from "preact/hooks";
import type { ThreadStore } from "./thread-store";

/** What the reviewer can do in an existing thread. */
export interface ThreadActions {
  readonly hasPendingReview: boolean;
  readonly reply: (
    thread: ReviewThread,
    body: string,
    mode: CommentMode,
  ) => Promise<Result<void, PostCommentError>>;
  readonly setResolved: (
    thread: ReviewThread,
    isResolved: boolean,
  ) => Promise<Result<void, HostError>>;
}

/** Absent where threads are only shown, e.g. in a view without a backend to write to. */
export const ThreadActionsContext = createContext<ThreadActions | null>(null);

export function useThreadActions(): ThreadActions | null {
  return useContext(ThreadActionsContext);
}

/**
 * Thread actions against `backend` that reload the shared threads afterwards, also after
 * a failure: the thread may be what changed (resolved or deleted elsewhere).
 */
export function createThreadActions(
  backend: ReviewBackend,
  store: ThreadStore,
  hasPendingReview: boolean,
): ThreadActions {
  const thenRefresh = async <T>(action: Promise<T>): Promise<T> => {
    const result = await action;
    await store.refresh();
    return result;
  };
  return {
    hasPendingReview,
    reply: (thread, body, mode) => thenRefresh(backend.replyToThread(thread, body, mode)),
    setResolved: (thread, isResolved) => thenRefresh(backend.setThreadResolved(thread, isResolved)),
  };
}
