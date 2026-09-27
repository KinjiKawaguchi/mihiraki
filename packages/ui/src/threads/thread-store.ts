import type { ReviewBackend, ReviewThread } from "@better-gh-md/core";
import { useEffect, useState } from "preact/hooks";

/** Review threads of a whole pull request, shared by every file view showing part of it. */
export interface ThreadStore {
  getThreads(): readonly ReviewThread[];
  getError(): unknown;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
}

export function createThreadStore(backend: ReviewBackend): ThreadStore {
  let threads: readonly ReviewThread[] = [];
  let error: unknown = null;
  let listeners: readonly (() => void)[] = [];

  return {
    getThreads: () => threads,
    getError: () => error,
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((existing) => existing !== listener);
      };
    },
    refresh: async () => {
      try {
        threads = await backend.loadThreads();
        error = null;
      } catch (loadError) {
        error = loadError;
      }
      for (const listener of listeners) listener();
    },
  };
}

export function useThreadStore(store: ThreadStore): {
  threads: readonly ReviewThread[];
  error: unknown;
} {
  const [snapshot, setSnapshot] = useState(() => ({
    threads: store.getThreads(),
    error: store.getError(),
  }));
  useEffect(() => {
    const update = () => setSnapshot({ threads: store.getThreads(), error: store.getError() });
    update();
    return store.subscribe(update);
  }, [store]);
  return snapshot;
}
