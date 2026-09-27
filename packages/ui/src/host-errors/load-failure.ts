import { err, type HostError, type Result } from "@mihiraki/core";

/** Why something could not be loaded from the backend. */
export type LoadFailure =
  | { readonly kind: "host"; readonly error: HostError }
  /** The backend broke its contract by rejecting: a bug, shown as is so it can be reported. */
  | { readonly kind: "crash"; readonly error: unknown };

/** Turns both a failure value and a rejection into a LoadFailure, so neither is lost. */
export function settleLoad<T>(
  loading: Promise<Result<T, HostError>>,
): Promise<Result<T, LoadFailure>> {
  return loading.then(
    (result) => (result.ok ? result : err({ kind: "host", error: result.error })),
    (error: unknown) => err({ kind: "crash", error }),
  );
}
