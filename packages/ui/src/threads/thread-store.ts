import type { ReviewBackend, ReviewThread, Revision } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";

/** Review threads of a whole pull request, shared by every file view showing part of it. */
export interface ThreadStore {
  getThreads(): readonly ReviewThread[];
  /** Revision the threads' lines refer to; null until the first successful load. */
  getRevision(): Revision | null;
  getError(): unknown;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
}

export function createThreadStore(backend: ReviewBackend): ThreadStore {
  let threads: readonly ReviewThread[] = [];
  let revision: Revision | null = null;
  let error: unknown = null;
  let listeners: readonly (() => void)[] = [];
  let latestRequest = 0;

  return {
    getThreads: () => threads,
    getRevision: () => revision,
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
      try {
        const snapshot = await backend.loadThreads();
        if (request !== latestRequest) return;
        threads = snapshot.threads;
        revision = snapshot.revision;
        error = null;
      } catch (loadError) {
        if (request !== latestRequest) return;
        error = loadError;
      }
      for (const listener of listeners) listener();
    },
  };
}

export interface ThreadStoreSnapshot {
  readonly threads: readonly ReviewThread[];
  readonly revision: Revision | null;
  readonly error: unknown;
}

function snapshotOf(store: ThreadStore): ThreadStoreSnapshot {
  return { threads: store.getThreads(), revision: store.getRevision(), error: store.getError() };
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
