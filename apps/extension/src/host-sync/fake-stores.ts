import type { ZustandStore } from "./github-stores";

export type State = Record<string, unknown>;

/** A minimal Zustand store, as GitHub's providers hold them. */
export function createStore(initial: State): ZustandStore {
  let state = initial;
  let listeners: ((next: State, previous: State) => void)[] = [];
  return {
    getState: () => state,
    setState: (partial: Partial<State>) => {
      const previous = state;
      state = { ...state, ...partial };
      for (const listener of listeners) listener(state, previous);
    },
    subscribe: (listener) => {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((l) => l !== listener);
      };
    },
  };
}
