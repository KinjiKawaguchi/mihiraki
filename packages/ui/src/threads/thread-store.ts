import type { ReviewBackend, ReviewThread, Revision } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";
import { type LoadFailure, settleLoad } from "../host-errors/load-failure";

/** Review threads of a whole pull request, shared by every file view showing part of it. */
export interface ThreadStore {
  getThreads(): readonly ReviewThread[];
  /** Revision the threads' lines refer to; null until the first successful load. */
  getRevision(): Revision | null;
  /** Whether the viewer has an unsubmitted review; false until the first successful load. */
  hasPendingReview(): boolean;
  /** Why the latest refresh failed; null once one succeeds. */
  getError(): LoadFailure | null;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
}

export function createThreadStore(backend: ReviewBackend): ThreadStore {
  let threads: readonly ReviewThread[] = [];
  let revision: Revision | null = null;
  let isReviewPending = false;
  let error: LoadFailure | null = null;
  let listeners: readonly (() => void)[] = [];
  let latestRequest = 0;

  return {
    getThreads: () => threads,
    getRevision: () => revision,
    hasPendingReview: () => isReviewPending,
    getError: () => error,
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((existing) => existing !== listener);
      };
    },
    refresh: async () => {
      // Refreshes overlap (after a post, on host changes); only the newest may land.
      latestRequest += 1;
      const request = latestRequest;
      const loaded = await settleLoad(backend.loadThreads());
      if (request !== latestRequest) return;
      if (loaded.ok) {
        threads = loaded.value.threads;
        revision = loaded.value.revision;
        isReviewPending = loaded.value.hasPendingReview;
        error = null;
      } else {
        error = loaded.error;
      }
      for (const listener of listeners) listener();
    },
  };
}

export interface ThreadStoreSnapshot {
  readonly threads: readonly ReviewThread[];
  readonly revision: Revision | null;
  readonly hasPendingReview: boolean;
  readonly error: LoadFailure | null;
}

function snapshotOf(store: ThreadStore): ThreadStoreSnapshot {
  return {
    threads: store.getThreads(),
    revision: store.getRevision(),
    hasPendingReview: store.hasPendingReview(),
    error: store.getError(),
  };
}

export function useThreadStore(store: ThreadStore): ThreadStoreSnapshot {
  const [snapshot, setSnapshot] = useState(() => snapshotOf(store));
  useEffect(() => {
    const update = () => setSnapshot(snapshotOf(store));
    update();
    return store.subscribe(update);
  }, [store]);
  return snapshot;
}
