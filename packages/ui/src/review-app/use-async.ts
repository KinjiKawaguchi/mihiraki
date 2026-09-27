import { useEffect, useState } from 'preact/hooks';

export interface AsyncState<T> {
  readonly status: 'loading' | 'success' | 'error';
  /** Last successfully loaded value; kept while reloading to avoid flicker. */
  readonly value: T | undefined;
  readonly error: unknown;
}

/** Runs `load` whenever `deps` change and ignores results that arrive after a newer run started. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', value: undefined, error: undefined });

  useEffect(() => {
    let isCurrent = true;
    setState((previous) => ({ status: 'loading', value: previous.value, error: undefined }));
    load().then(
      (value) => {
        if (isCurrent) setState({ status: 'success', value, error: undefined });
      },
      (error: unknown) => {
        if (isCurrent) setState((previous) => ({ status: 'error', value: previous.value, error }));
      },
    );
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
