import type { ReviewBackend, ThreadSnapshot } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";
import { type LoadFailure, settleLoad } from "../host-errors/load-failure";

export interface ThreadStoreState {
  /** The latest threads loaded; null until the first load succeeds. */
  readonly snapshot: ThreadSnapshot | null;
  /** Why the latest refresh failed; null once one succeeds. */
  readonly error: LoadFailure | null;
}

/** Review threads of a whole pull request, shared by every file view showing part of it. */
export interface ThreadStore {
  getState(): ThreadStoreState;
  subscribe(listener: () => void): () => void;
  refresh(): Promise<void>;
}

export function createThreadStore(backend: ReviewBackend): ThreadStore {
  let state: ThreadStoreState = { snapshot: null, error: null };
  let listeners: readonly (() => void)[] = [];
  let latestRequest = 0;
  let latestRefresh: Promise<void> = Promise.resolve();

  return {
    getState: () => state,
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((existing) => existing !== listener);
      };
    },
    refresh: () => {
      // Refreshes overlap (after a post, on host changes); only the newest may land. One
      // overtaken finishes with the newest, so whoever waits for it sees current threads.
      latestRequest += 1;
      const request = latestRequest;
      const refresh = settleLoad(backend.loadThreads()).then((loaded) => {
        if (request !== latestRequest) return latestRefresh;
        state = loaded.ok
          ? { snapshot: loaded.value, error: null }
          : { snapshot: state.snapshot, error: loaded.error };
        for (const listener of listeners) listener();
      });
      latestRefresh = refresh;
      return refresh;
    },
  };
}

export function useThreadStore(store: ThreadStore): ThreadStoreState {
  const [state, setState] = useState(() => store.getState());
  useEffect(() => {
    const update = () => setState(store.getState());
    update();
    return store.subscribe(update);
  }, [store]);
  return state;
}
