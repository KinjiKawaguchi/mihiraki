import type { HostError, Result } from "@mihiraki/core";
import { useEffect, useState } from "preact/hooks";
import { type LoadFailure, settleLoad } from "../host-errors/load-failure";

/** `value` is the last successfully loaded one, kept while reloading to avoid flicker. */
export type AsyncState<T> =
  | { readonly status: "loading"; readonly value: T | undefined }
  | { readonly status: "success"; readonly value: T }
  | { readonly status: "failure"; readonly value: T | undefined; readonly failure: LoadFailure };

/** Runs `load` whenever `deps` change and ignores results that arrive after a newer run started. */
export function useAsync<T>(
  load: () => Promise<Result<T, HostError>>,
  deps: readonly unknown[],
): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: "loading", value: undefined });

  useEffect(() => {
    let isCurrent = true;
    setState((previous) => ({ status: "loading", value: previous.value }));
    void settleLoad(load()).then((loaded) => {
      if (!isCurrent) return;
      setState((previous) =>
        loaded.ok
          ? { status: "success", value: loaded.value }
          : { status: "failure", value: previous.value, failure: loaded.error },
      );
    });
    return () => {
      isCurrent = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
