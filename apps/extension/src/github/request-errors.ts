import type { PostCommentError } from "@mihiraki/core";

/**
 * Failures of talking to GitHub, raised inside this adapter and turned into values at
 * the ReviewBackend boundary. The messages are what loading failures show as is.
 */
export class RequestTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(
      `GitHubから${Math.round(timeoutMs / 1000)}秒以内に応答がありませんでした。時間をおいて再度お試しください。`,
    );
    this.name = "RequestTimeoutError";
  }
}

export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("GitHubと通信できませんでした。ネットワーク接続を確認してください。", { cause });
    this.name = "NetworkError";
  }
}

/** GitHub answered with an error status. */
export class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpStatusError";
  }
}

/** GitHub answered with something this adapter does not understand (its internals changed). */
export class UnexpectedResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnexpectedResponseError";
  }
}

/** The PostCommentError for a failure above; anything else is a bug and is rethrown. */
export function toPostCommentError(error: unknown): PostCommentError {
  if (error instanceof RequestTimeoutError) return { kind: "timeout" };
  if (error instanceof NetworkError) return { kind: "network" };
  if (error instanceof HttpStatusError) return { kind: "rejected", detail: `HTTP ${error.status}` };
  if (error instanceof UnexpectedResponseError) return { kind: "unexpectedResponse" };
  throw error;
}
