import type { HostError } from "@mihiraki/core";
import { errorMessage } from "../format";
import type { Messages } from "../i18n/messages";
import type { LoadFailure } from "./load-failure";

/** `what` failed (e.g. "Could not load docs/a.md"), followed by why, for the reviewer to read. */
export function describeHostFailure(t: Messages, what: string, error: HostError): string {
  switch (error.kind) {
    case "rejected":
      return error.detail ? t.failureWithDetail(what, error.detail) : t.failure(what, null);
    case "timeout":
      return t.failure(what, t.timeout);
    case "network":
      return t.failure(what, t.network);
    case "unexpectedResponse":
      return t.failure(what, t.unexpectedResponse);
  }
}

export function describeLoadFailure(t: Messages, what: string, failure: LoadFailure): string {
  return failure.kind === "host"
    ? describeHostFailure(t, what, failure.error)
    : t.failure(what, errorMessage(failure.error));
}
