import { err, type HostError, ok, type Result } from "@mihiraki/core";

/*
 * Failures of talking to GitHub, raised inside this adapter and turned into HostError
 * values at the ReviewBackend boundary. Their messages are for logs; the UI words
 * failures for the reviewer from the HostError alone.
 */

export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`No answer from GitHub within ${timeoutMs} ms`);
    this.name = "RequestTimeoutError";
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach GitHub", { cause });
    this.name = "NetworkError";
  }
}

/** GitHub answered with an error status. */
export class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`GitHub answered with HTTP ${status}`);
    this.name = "HttpStatusError";
  }
}

/** GitHub answered with something this adapter does not understand (its internals changed). */
export class UnexpectedResponseError extends Error {
  constructor(what: string) {
    super(`Unexpected response from GitHub: ${what}`);
    this.name = "UnexpectedResponseError";
  }
}

/** The HostError for a failure above; anything else is a bug and is rethrown. */
export function toHostError(error: unknown): HostError {
  if (error instanceof RequestTimeoutError) return { kind: "timeout" };
  if (error instanceof NetworkError) return { kind: "network" };
  if (error instanceof HttpStatusError) return { kind: "rejected", detail: `HTTP ${error.status}` };
  if (error instanceof UnexpectedResponseError) return { kind: "unexpectedResponse" };
  throw error;
}

/** Runs a request, returning its foreseeable failures as values and letting bugs reject. */
export async function settleRequest<T>(run: () => Promise<T>): Promise<Result<T, HostError>> {
  try {
    return ok(await run());
  } catch (error) {
    return err(toHostError(error));
  }
}
